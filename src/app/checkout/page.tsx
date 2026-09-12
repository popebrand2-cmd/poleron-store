"use client";

import { useEffect, useMemo, useState } from "react";
import { useCartStore } from "@/lib/cart-store";
import { formatCLP } from "@/lib/money";

type ShippingRate = { region: string; comuna: string; priceCLP: number };
type ShippingInfo = {
  rates: ShippingRate[];
  pickup: { enabled: boolean; address: string; hours: string };
};

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
  const [address, setAddress] = useState("");
  const [method, setMethod] = useState<"PICKUP" | "DELIVERY">("DELIVERY");
  const [comuna, setComuna] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const regions = useMemo(() => {
    const map = new Map<string, ShippingRate[]>();
    for (const r of shipping?.rates ?? []) {
      if (!map.has(r.region)) map.set(r.region, []);
      map.get(r.region)!.push(r);
    }
    return Array.from(map.entries());
  }, [shipping]);

  if (!mounted) return null;

  const subtotal = items.reduce((sum, i) => sum + i.unitPrice * i.quantity, 0);
  const shippingCost =
    method === "PICKUP" ? 0 : (shipping?.rates.find((r) => r.comuna === comuna)?.priceCLP ?? null);
  const total = subtotal + (shippingCost ?? 0);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");

    if (method === "DELIVERY" && shippingCost === null) {
      setError("Elige una comuna para calcular el envío.");
      return;
    }

    setLoading(true);
    const res = await fetch("/api/checkout", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        customerName: name,
        customerEmail: email,
        customerPhone: phone,
        shippingMethod: method,
        shippingComuna: method === "DELIVERY" ? comuna : "",
        shippingAddr: method === "DELIVERY" ? address : shipping?.pickup.address ?? "",
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
        <div className="mx-auto max-w-xl rounded-2xl bg-white p-10 text-center text-neutral-500">
          Tu carrito está vacío.
        </div>
      </main>
    );
  }

  return (
    <main className="bg-black px-6 py-10">
    <div className="mx-auto max-w-xl rounded-2xl bg-white p-6 text-neutral-900 sm:p-8">
      <h1 className="mb-6 text-2xl font-semibold">Datos de envío y pago</h1>
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
            <div>
              <label className="mb-1 block text-sm font-medium">Comuna</label>
              <select
                required
                value={comuna}
                onChange={(e) => setComuna(e.target.value)}
                className="w-full rounded-md border border-neutral-300 bg-white px-3 py-2"
              >
                <option value="">Selecciona tu comuna</option>
                {regions.map(([region, rates]) => (
                  <optgroup key={region} label={region}>
                    {rates.map((r) => (
                      <option key={r.comuna} value={r.comuna}>
                        {r.comuna} — {formatCLP(r.priceCLP)}
                      </option>
                    ))}
                  </optgroup>
                ))}
              </select>
              {shipping && regions.length === 0 && (
                <p className="mt-1 text-xs text-neutral-500">
                  Por ahora no hay comunas con envío configurado — escríbenos para coordinar.
                </p>
              )}
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium">Dirección (calle y número)</label>
              <textarea
                required
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                rows={2}
                className="w-full rounded-md border border-neutral-300 px-3 py-2"
              />
            </div>
          </>
        )}

        <div className="space-y-1 border-t border-neutral-200 pt-4">
          <div className="flex items-center justify-between text-sm text-neutral-600">
            <p>Subtotal</p>
            <p>{formatCLP(subtotal)}</p>
          </div>
          <div className="flex items-center justify-between text-sm text-neutral-600">
            <p>Envío</p>
            <p>{method === "PICKUP" ? "Gratis" : shippingCost === null ? "—" : formatCLP(shippingCost)}</p>
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
          className="w-full rounded-md bg-neutral-900 px-6 py-3 font-medium text-white disabled:opacity-50"
        >
          {loading ? "Redirigiendo a pago..." : "Pagar con Mercado Pago"}
        </button>
      </form>
    </div>
    </main>
  );
}
