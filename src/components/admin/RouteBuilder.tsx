"use client";

import { useState } from "react";

export type DeliveryOrder = {
  id: string;
  number: string;
  name: string;
  comuna: string;
  address: string;
  status: string;
  items: number;
  delivery: boolean;
};

type Plan = {
  start: string;
  totalKm: number;
  links: { label: string; url: string }[];
  stops: { orderId: string; number: string; name: string; phone: string; address: string; comuna: string; note: string; approx: boolean; legKm: number; items: string[] }[];
};

const STATUS: Record<string, string> = { PAID: "Pagado", IN_PRODUCTION: "En producción" };

// The delivery day: pick the orders, get the shortest route (stops in order, with a Google Maps link for the phone) and print the
// labels in that same order.
export default function RouteBuilder({ orders, defaultStart }: { orders: DeliveryOrder[]; defaultStart: string }) {
  const [chosen, setChosen] = useState<Set<string>>(() => new Set(orders.filter((o) => o.delivery).map((o) => o.id)));
  const [start, setStart] = useState(defaultStart);
  const [plan, setPlan] = useState<Plan | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const toggle = (id: string) =>
    setChosen((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });

  async function build() {
    const ids = orders.filter((o) => o.delivery && chosen.has(o.id)).map((o) => o.id);
    if (ids.length === 0) {
      setError("Elige al menos un pedido con envío a domicilio.");
      return;
    }
    setBusy(true);
    setError("");
    setPlan(null);
    try {
      const res = await fetch("/api/admin/reparto/plan", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ orderIds: ids, startAddress: start }) });
      const data = (await res.json()) as Plan & { error?: string };
      if (!res.ok) throw new Error(data.error ?? "No se pudo armar la ruta.");
      setPlan(data);
    } catch (e) {
      setError(e instanceof Error ? e.message : "No se pudo armar la ruta.");
    } finally {
      setBusy(false);
    }
  }

  const chosenIds = orders.filter((o) => chosen.has(o.id)).map((o) => o.id);
  const labelIds = plan ? plan.stops.map((s) => s.orderId) : chosenIds;
  const labelsHref = (size: string) => `/admin/reparto/etiquetas?ids=${labelIds.join(",")}&size=${size}${plan ? "&ruta=1" : ""}`;
  const btn = "rounded-full bg-neutral-900 px-5 py-2.5 text-sm font-semibold text-white disabled:opacity-40";

  return (
    <div className="space-y-6">
      <section className="rounded-xl border border-neutral-200 p-4">
        <h2 className="font-semibold">1. Qué pedidos salen hoy</h2>
        {orders.length === 0 ? (
          <p className="mt-2 text-sm text-neutral-500">No hay pedidos pagados esperando salir.</p>
        ) : (
          <ul className="mt-3 divide-y divide-neutral-200">
            {orders.map((o) => (
              <li key={o.id}>
                <label className="flex cursor-pointer items-start gap-3 py-2.5">
                  <input type="checkbox" checked={chosen.has(o.id)} onChange={() => toggle(o.id)} className="mt-1 h-4 w-4 accent-[var(--neon)]" />
                  <span className="min-w-0 flex-1 text-sm">
                    <span className="font-semibold">{o.number}</span> · {o.name}
                    <span className="ml-2 rounded-full bg-neutral-200 px-2 py-0.5 text-[11px] text-neutral-700">{STATUS[o.status] ?? o.status}</span>
                    <span className="block text-neutral-500">
                      {o.delivery ? `${o.address || "—"}, ${o.comuna}` : "Retiro en tienda (no entra en la ruta)"} · {o.items} producto(s)
                    </span>
                  </span>
                </label>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="rounded-xl border border-neutral-200 p-4">
        <h2 className="font-semibold">2. Desde dónde sale el reparto</h2>
        <p className="mt-1 text-sm text-neutral-500">Tu taller o punto de retiro. Si lo dejas vacío, la ruta empieza en el primer punto que convenga.</p>
        <input
          value={start}
          onChange={(e) => setStart(e.target.value)}
          placeholder="Ej: Av. Providencia 1234, Providencia"
          className="mt-2 w-full rounded-lg border border-neutral-300 px-3 py-2 text-sm"
        />
        <button type="button" onClick={build} disabled={busy || chosenIds.length === 0} className={`mt-4 ${btn}`}>
          {busy ? "Armando la ruta… (puede tardar unos segundos)" : "Generar ruta óptima"}
        </button>
        {error && <p className="mt-3 text-sm text-red-600">{error}</p>}
      </section>

      {plan && (
        <section className="rounded-xl border border-neutral-200 p-4">
          <h2 className="font-semibold">3. Ruta del reparto</h2>
          <p className="mt-1 text-sm text-neutral-600">
            {plan.stops.length} parada(s) · unos <strong>{plan.totalKm} km</strong> en total{plan.start ? ` desde ${plan.start}` : ""}. Distancias aproximadas.
          </p>
          <div className="mt-3 flex flex-wrap gap-2">
            {plan.links.map((l) => (
              <a key={l.url} href={l.url} target="_blank" rel="noopener noreferrer" className="rounded-full bg-neon px-4 py-2 text-sm font-bold text-black">
                {l.label}
              </a>
            ))}
          </div>
          <ol className="mt-4 space-y-3">
            {plan.stops.map((s, i) => (
              <li key={s.orderId} className="flex gap-3 rounded-lg border border-neutral-200 p-3">
                <span className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-neutral-900 text-sm font-bold text-white">{i + 1}</span>
                <div className="min-w-0 text-sm">
                  <p className="font-semibold">
                    {s.number} · {s.name}
                    {s.legKm > 0 && <span className="ml-2 text-xs font-normal text-neutral-500">+{s.legKm} km</span>}
                  </p>
                  <p>
                    {s.address || "—"}, {s.comuna}
                  </p>
                  {s.phone && (
                    <p>
                      <a href={`tel:${s.phone.replace(/[^\d+]/g, "")}`} className="text-fuchsia-600 hover:underline">
                        {s.phone}
                      </a>
                    </p>
                  )}
                  <p className="text-neutral-500">{s.items.join(" · ")}</p>
                  {s.approx && <p className="text-xs text-amber-600">Ubicación aproximada: confirma la dirección con el cliente.</p>}
                </div>
              </li>
            ))}
          </ol>
        </section>
      )}

      <section className="rounded-xl border border-neutral-200 p-4">
        <h2 className="font-semibold">{plan ? "4. Etiquetas, en el orden de la ruta" : "3. Etiquetas de los pedidos elegidos"}</h2>
        <p className="mt-1 text-sm text-neutral-500">
          Cada etiqueta lleva el número de pedido, el cliente, la dirección y lo que compró{plan ? ", y el número de parada" : ""}.
        </p>
        <div className="mt-3 flex flex-wrap gap-2">
          <a
            href={labelsHref("a4")}
            target="_blank"
            rel="noopener noreferrer"
            aria-disabled={labelIds.length === 0}
            className={`${btn} ${labelIds.length === 0 ? "pointer-events-none opacity-40" : ""}`}
          >
            Imprimir en hoja A4 (8 por hoja)
          </a>
          <a
            href={labelsHref("termica")}
            target="_blank"
            rel="noopener noreferrer"
            aria-disabled={labelIds.length === 0}
            className={`rounded-full border-2 border-neutral-900 px-5 py-2.5 text-sm font-semibold ${labelIds.length === 0 ? "pointer-events-none opacity-40" : ""}`}
          >
            Impresora de etiquetas (100×150 mm)
          </a>
        </div>
      </section>
    </div>
  );
}
