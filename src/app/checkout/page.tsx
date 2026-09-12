"use client";

import { useEffect, useState } from "react";
import { useCartStore } from "@/lib/cart-store";
import { formatCLP } from "@/lib/money";

type ShippingRate = { region: string; comuna: string; priceCLP: number };
type ShippingInfo = {
  rates: ShippingRate[];
  pickup: { enabled: boolean; address: string; hours: string };
};

function normalize(s: string) {
  return s
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .trim()
    .toLowerCase();
}

export default function CheckoutPage() {
  const items = useCartStore((s) => s.items);
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  const [shipping, setShipping] = useState<ShippingInfo | null>(null);
  useEffect(() => {
    fetch("/api/shipping")
      .then((res) => res.json())
      .then((data: ShippingInfo) => {
        setShipping(data);
        setMethod(data.pickup.enabled ? "PICKUP" : "DELIVERY");
      })
      .catch(() => setShipping({ rates: [], pickup: { enabled: false, address: "", hours: "" } }));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [calle, setCalle] = useState("");
  const [numero, setNumero] = useState("");
  const [referencia, setReferencia] = useState("");
  const [method, setMethod] = useState<"PICKUP" | "DELIVERY">("DELIVERY");
  const [comuna, setComuna] = useState("");
  const [comunaFocused, setComunaFocused] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  if (!mounted) return null;

  const matchedRate = shipping?.rates.find((r) => normalize(r.comuna) === normalize(comuna)) ?? null;
  const comunaSuggestions =
    comuna.trim() && !matchedRate
      ? (shipping?.rates.filter((r) => normalize(r.comuna).includes(normalize(comuna))) ?? []).slice(0, 6)
      : [];
  const addressComplete = Boolean(matchedRate && calle.trim() && numero.trim());

  const subtotal = items.reduce((sum, i) => sum + i.unitPrice * i.quantity, 0);
  const shippingCost = method === "PICKUP" ? 0 : addressComplete ? matchedRate!.priceCLP : null;
  const total = subtotal + (shippingCost ?? 0);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");

    if (method === "DELIVERY" && !matchedRate) {
      setError("Escribe una comuna válida de nuestra cobertura de envío.");
      return;
    }
    if (method === "DELIVERY" && (!calle.trim() || !numero.trim())) {
      setError("Completa la calle y el número de tu dirección.");
      return;
    }

    const fullAddress = [
      [calle.trim(), numero.trim()].filter(Boolean).join(" "),
      referencia.trim() && `Ref: ${referencia.trim()}`,
    ]
      .filter(Boolean)
      .join(" — ");

    setLoading(true);
    const res = await fetch("/api/checkout", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        customerName: name,
        customerEmail: email,
        customerPhone: phone,
        shippingMethod: method,
        shippingComuna: method === "DELIVERY" ? matchedRate!.comuna : "",
        shippingAddr: method === "DELIVERY" ? fullAddress : shipping?.pickup.address ?? "",
        items,
      }),
    });

    const data = await res.json();
    setLoading(false);

    if (!res.ok) {
      setError(data.error ?? "No se pudo procesar el pedido.");
      return;
    }

    window.location.href = data.redirectUrl;
  }

  if (items.length === 0) {
    return (
      <main className="bg-black px-6 py-16">
        <div className="relative mx-auto max-w-xl overflow-hidden rounded-2xl bg-white p-10 text-center text-neutral-500">
          <div className="absolute inset-x-0 top-0 h-1.5 bg-neon" />
          Tu carrito está vacío.
        </div>
      </main>
    );
  }

  return (
    <main className="bg-black px-6 py-10">
    <div className="relative mx-auto max-w-xl overflow-hidden rounded-2xl bg-white p-6 text-neutral-900 sm:p-8">
      <div className="absolute inset-x-0 top-0 h-1.5 bg-neon" />
      <h1 className="mb-4 text-2xl font-semibold">Datos de envío y pago</h1>

      <div className="mb-6 space-y-3 rounded-lg border border-neutral-200 bg-neutral-50 p-3">
        {items.map((item) => (
          <div key={item.id} className="flex items-center gap-3">
            {item.previewImageUrl && (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={item.previewImageUrl}
                alt={item.productName}
                className="h-14 w-14 shrink-0 rounded-md border border-neutral-200 object-cover"
              />
            )}
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium">{item.productName}</p>
              <p className="text-xs text-neutral-500">
                Color {item.colorName} · Talla {item.sizeLabel} · x{item.quantity}
              </p>
            </div>
            <p className="shrink-0 text-sm font-medium">{formatCLP(item.unitPrice * item.quantity)}</p>
          </div>
        ))}
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="mb-1 block text-sm font-medium">Nombre completo</label>
          <input
            required
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="w-full rounded-md border border-neutral-300 px-3 py-2"
          />
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium">Email</label>
          <input
            required
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full rounded-md border border-neutral-300 px-3 py-2"
          />
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium">Teléfono</label>
          <input
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            className="w-full rounded-md border border-neutral-300 px-3 py-2"
          />
        </div>

        <div>
          <p className="mb-2 text-sm font-medium">Entrega</p>
          <div className="space-y-2">
            {shipping?.pickup.enabled && (
              <label className="flex items-start gap-2 rounded-md border border-neutral-300 p-3 text-sm">
                <input
                  type="radio"
                  name="method"
                  checked={method === "PICKUP"}
                  onChange={() => setMethod("PICKUP")}
                  className="mt-0.5"
                />
                <span>
                  <span className="font-medium">Retiro en tienda (gratis)</span>
                  <br />
                  <span className="text-neutral-500">
                    {shipping.pickup.address}
                    {shipping.pickup.hours && ` · ${shipping.pickup.hours}`}
                  </span>
                </span>
              </label>
            )}
            <label className="flex items-start gap-2 rounded-md border border-neutral-300 p-3 text-sm">
              <input
                type="radio"
                name="method"
                checked={method === "DELIVERY"}
                onChange={() => setMethod("DELIVERY")}
                className="mt-0.5"
              />
              <span className="font-medium">Envío a domicilio</span>
            </label>
          </div>
        </div>

        {method === "DELIVERY" && (
          <>
            <div className="relative">
              <label className="mb-1 block text-sm font-medium">Comuna</label>
              <input
                required
                autoComplete="off"
                value={comuna}
                onChange={(e) => setComuna(e.target.value)}
                onFocus={() => setComunaFocused(true)}
                onBlur={() => setTimeout(() => setComunaFocused(false), 150)}
                placeholder="Escribe tu comuna"
                className="w-full rounded-md border border-neutral-300 px-3 py-2"
              />
              {matchedRate ? (
                <p className="mt-1 text-xs text-green-700">
                  {matchedRate.comuna} · {matchedRate.region}
                </p>
              ) : shipping && shipping.rates.length === 0 ? (
                <p className="mt-1 text-xs text-neutral-500">
                  Por ahora no hay comunas con envío configurado — escríbenos para coordinar.
                </p>
              ) : comuna.trim() && comunaSuggestions.length === 0 ? (
                <p className="mt-1 text-xs text-red-600">
                  No hacemos envíos a esa comuna todavía. Verifica que esté bien escrita.
                </p>
              ) : null}

              {comunaFocused && comunaSuggestions.length > 0 && (
                <ul className="absolute z-10 mt-1 w-full overflow-hidden rounded-md border border-neutral-200 bg-white shadow-lg">
                  {comunaSuggestions.map((r) => (
                    <li key={r.comuna}>
                      <button
                        type="button"
                        onClick={() => setComuna(r.comuna)}
                        className="flex w-full items-center justify-between px-3 py-2 text-left text-sm hover:bg-neutral-50"
                      >
                        <span>
                          {r.comuna} <span className="text-neutral-400">· {r.region}</span>
                        </span>
                        <span className="text-neutral-500">{formatCLP(r.priceCLP)}</span>
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>

            {matchedRate && (
              <>
                <div className="grid grid-cols-3 gap-3">
                  <div className="col-span-2">
                    <label className="mb-1 block text-sm font-medium">Calle</label>
                    <input
                      required
                      value={calle}
                      onChange={(e) => setCalle(e.target.value)}
                      className="w-full rounded-md border border-neutral-300 px-3 py-2"
                    />
                  </div>
                  <div>
                    <label className="mb-1 block text-sm font-medium">Número</label>
                    <input
                      required
                      value={numero}
                      onChange={(e) => setNumero(e.target.value)}
                      className="w-full rounded-md border border-neutral-300 px-3 py-2"
                    />
                  </div>
                </div>
                <div>
                  <label className="mb-1 block text-sm font-medium">Referencia (opcional)</label>
                  <input
                    value={referencia}
                    onChange={(e) => setReferencia(e.target.value)}
                    placeholder="Depto, casa, entre calles, color de la fachada…"
                    className="w-full rounded-md border border-neutral-300 px-3 py-2"
                  />
                </div>
                {calle.trim() && numero.trim() && (
                  <a
                    href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
                      `${calle} ${numero}, ${matchedRate.comuna}, Chile`,
                    )}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 text-xs font-medium text-green-700 hover:underline"
                  >
                    Confirmar ubicación en Google Maps ↗
                  </a>
                )}
              </>
            )}
          </>
        )}

        <div className="space-y-1 border-t border-neutral-200 pt-4">
          <div className="flex items-center justify-between text-sm text-neutral-600">
            <p>Subtotal</p>
            <p>{formatCLP(subtotal)}</p>
          </div>
          <div className="flex items-center justify-between text-sm text-neutral-600">
            <p>Envío</p>
            <p>
              {method === "PICKUP"
                ? "Gratis"
                : shippingCost === null
                  ? "Completa tu dirección"
                  : formatCLP(shippingCost)}
            </p>
          </div>
          <div className="flex items-center justify-between pt-1 font-semibold">
            <p>Total</p>
            <p>{formatCLP(total)}</p>
          </div>
        </div>

        {error && <p className="text-sm text-red-600">{error}</p>}

        <button
          type="submit"
          disabled={loading}
          className="group flex w-full items-center justify-center gap-3 rounded-full bg-neon py-3 pl-6 pr-2 text-sm font-bold uppercase tracking-wide text-black transition hover:brightness-90 disabled:opacity-50"
        >
          {loading ? "Redirigiendo a pago..." : "Pagar con Mercado Pago"}
          {!loading && (
            <span className="flex h-8 w-8 items-center justify-center rounded-full bg-black text-neon transition group-hover:translate-x-0.5">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="h-4 w-4">
                <path strokeLinecap="round" strokeLinejoin="round" d="M5 12h14M13 6l6 6-6 6" />
              </svg>
            </span>
          )}
        </button>
        <p className="flex items-center justify-center gap-1.5 text-xs text-neutral-500">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.6} className="h-3.5 w-3.5">
            <rect x="5" y="11" width="14" height="9" rx="1.5" />
            <path strokeLinecap="round" d="M8 11V7a4 4 0 0 1 8 0v4" />
          </svg>
          Pago 100% seguro, procesado por Mercado Pago
        </p>
      </form>
    </div>
    </main>
  );
}
