"use client";

import { useEffect, useMemo, useState } from "react";
import { formatCLP } from "@/lib/money";
import { MP_FEE_LABEL, calcOrder } from "@/lib/sales-report";

// Admin > Ventas: every paid order of the period with total, shipping, Mercado Pago fee and net, a search box
// (order, customer or product) and a detail panel with the calculation. Cards on phones, a table on wider screens.
export type SaleRow = {
  id: string;
  number: string;
  createdAt: string; // ISO
  status: string;
  customerName: string;
  customerEmail: string;
  shippingMethod: string;
  shippingComuna: string;
  shippingCost: number;
  totalAmount: number;
  items: { productName: string; colorName: string; materialLabel: string; sizeLabel: string; quantity: number; unitPrice: number }[];
};

const STATUS: Record<string, { label: string; cls: string }> = {
  PAID: { label: "Pagado", cls: "bg-neon text-black" },
  IN_PRODUCTION: { label: "En producción", cls: "bg-white/10 text-white ring-1 ring-white/30" },
  SHIPPED: { label: "Terminado", cls: "text-neutral-400 ring-1 ring-white/15" },
};

const DATE_FMT = new Intl.DateTimeFormat("es-CL", { timeZone: "America/Santiago", day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" });

function norm(s: string): string {
  return s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();
}

function variant(i: SaleRow["items"][number]): string {
  return [i.colorName, i.materialLabel].filter(Boolean).join(" · ");
}

export default function SalesOrdersTable({ orders }: { orders: SaleRow[] }) {
  const [query, setQuery] = useState("");
  const [openId, setOpenId] = useState<string | null>(null);

  const filtered = useMemo(() => {
    const q = norm(query.trim());
    if (!q) return orders;
    return orders.filter((o) =>
      norm([o.number, o.customerName, o.customerEmail, ...o.items.map((i) => `${i.productName} ${i.colorName} ${i.materialLabel} ${i.sizeLabel}`)].join(" ")).includes(q),
    );
  }, [orders, query]);

  const totals = useMemo(() => {
    const t = { gross: 0, shipping: 0, fee: 0, net: 0 };
    for (const o of filtered) {
      const c = calcOrder(o);
      t.gross += c.gross;
      t.shipping += c.shipping;
      t.fee += c.fee;
      t.net += c.net;
    }
    return t;
  }, [filtered]);

  const open = openId ? (orders.find((o) => o.id === openId) ?? null) : null;

  return (
    <div>
      <div className="mb-4 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <input
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Buscar pedido, cliente o producto"
          aria-label="Buscar pedido, cliente o producto"
          className="w-full rounded-full border border-neutral-300 px-4 py-2 text-sm outline-none placeholder:text-neutral-500 focus:border-neutral-900 sm:max-w-sm"
        />
        <p className="text-xs text-neutral-500">
          {filtered.length} de {orders.length} pedido{orders.length === 1 ? "" : "s"} · clic en un pedido para ver el cálculo
        </p>
      </div>

      {filtered.length === 0 ? (
        <p className="py-6 text-center text-sm text-neutral-500">{orders.length ? "Ningún pedido coincide con la búsqueda." : "Sin ventas en este período."}</p>
      ) : (
        <>
          {/* Phones: cards */}
          <ul className="-mx-4 divide-y divide-[#1f1f1f] sm:hidden">
            {filtered.map((o) => {
              const c = calcOrder(o);
              const st = STATUS[o.status] ?? { label: o.status, cls: "" };
              return (
                <li key={o.id}>
                  <button type="button" onClick={() => setOpenId(o.id)} className="w-full px-4 py-3 text-left">
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-bold text-neon">{o.number}</span>
                      <span className={`rounded-full px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wide ${st.cls}`}>{st.label}</span>
                    </div>
                    <p className="mt-0.5 text-xs text-neutral-500">
                      {DATE_FMT.format(new Date(o.createdAt))} · {o.customerName}
                    </p>
                    <p className="mt-1 text-sm">{o.items.map((i) => `${i.quantity}× ${i.productName} (${variant(i)}, ${i.sizeLabel})`).join(" · ")}</p>
                    <div className="mt-1.5 flex justify-between text-xs tabular-nums text-neutral-400">
                      <span>
                        {formatCLP(c.gross)}
                        {c.shipping ? ` · envío ${formatCLP(c.shipping)}` : ""} · −{formatCLP(c.fee)}
                      </span>
                      <span className="text-sm font-bold text-white">{formatCLP(c.net)}</span>
                    </div>
                  </button>
                </li>
              );
            })}
            <li className="flex justify-between px-4 py-3 text-sm font-bold">
              <span className="uppercase tracking-wider text-neutral-500">Neto</span>
              <span className="text-neon">{formatCLP(totals.net)}</span>
            </li>
          </ul>

          {/* Wider screens: table */}
          <div className="-mx-4 hidden overflow-x-auto sm:block">
            <table className="w-full min-w-[960px] text-sm [&_td.text-right]:whitespace-nowrap">
              <thead>
                <tr className="border-b border-[#2a2a2a] text-left text-[11px] font-bold uppercase tracking-wider text-neutral-500">
                  <th className="px-4 py-2">Pedido</th>
                  <th className="px-2 py-2">Fecha</th>
                  <th className="px-2 py-2">Cliente</th>
                  <th className="px-2 py-2">Productos</th>
                  <th className="px-2 py-2">Estado</th>
                  <th className="px-2 py-2 text-right">Total</th>
                  <th className="px-2 py-2 text-right">Envío</th>
                  <th className="px-2 py-2 text-right">Comisión</th>
                  <th className="px-4 py-2 text-right">Neto</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((o) => {
                  const c = calcOrder(o);
                  const st = STATUS[o.status] ?? { label: o.status, cls: "" };
                  return (
                    <tr
                      key={o.id}
                      onClick={() => setOpenId(o.id)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter" || e.key === " ") {
                          e.preventDefault();
                          setOpenId(o.id);
                        }
                      }}
                      tabIndex={0}
                      className="cursor-pointer border-b border-[#1f1f1f] align-top outline-none transition hover:bg-white/[0.04] focus-visible:bg-white/[0.06]"
                    >
                      <td className="px-4 py-3 font-bold text-neon">{o.number}</td>
                      <td className="whitespace-nowrap px-2 py-3 text-neutral-400">{DATE_FMT.format(new Date(o.createdAt))}</td>
                      <td className="max-w-[160px] truncate px-2 py-3">{o.customerName}</td>
                      <td className="px-2 py-3">
                        {o.items.map((i, k) => (
                          <div key={k} className="mb-1 leading-snug last:mb-0">
                            <span className="whitespace-nowrap">
                              {i.quantity}× {i.productName}
                            </span>
                            <span className="block whitespace-nowrap text-xs text-neutral-500">
                              {variant(i)} · Talla {i.sizeLabel}
                            </span>
                          </div>
                        ))}
                      </td>
                      <td className="px-2 py-3">
                        <span className={`whitespace-nowrap rounded-full px-2.5 py-0.5 text-[11px] font-bold uppercase tracking-wide ${st.cls}`}>{st.label}</span>
                      </td>
                      <td className="px-2 py-3 text-right tabular-nums">{formatCLP(c.gross)}</td>
                      <td className="px-2 py-3 text-right tabular-nums text-neutral-400">{c.shipping ? formatCLP(c.shipping) : "—"}</td>
                      <td className="px-2 py-3 text-right tabular-nums text-neutral-400">−{formatCLP(c.fee)}</td>
                      <td className="px-4 py-3 text-right font-bold tabular-nums">{formatCLP(c.net)}</td>
                    </tr>
                  );
                })}
              </tbody>
              <tfoot>
                <tr className="text-[13px] font-bold">
                  <td className="px-4 py-3 uppercase tracking-wider text-neutral-500" colSpan={5}>
                    {query ? "Total de la búsqueda" : "Total del período"}
                  </td>
                  <td className="px-2 py-3 text-right tabular-nums">{formatCLP(totals.gross)}</td>
                  <td className="px-2 py-3 text-right tabular-nums text-neutral-400">{formatCLP(totals.shipping)}</td>
                  <td className="px-2 py-3 text-right tabular-nums text-neutral-400">−{formatCLP(totals.fee)}</td>
                  <td className="px-4 py-3 text-right tabular-nums text-neon">{formatCLP(totals.net)}</td>
                </tr>
              </tfoot>
            </table>
          </div>
        </>
      )}

      {open && <OrderDetail order={open} onClose={() => setOpenId(null)} />}
    </div>
  );
}

function OrderDetail({ order, onClose }: { order: SaleRow; onClose: () => void }) {
  const c = calcOrder(order);
  const st = STATUS[order.status] ?? { label: order.status, cls: "" };
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onClose]);

  return (
    <div className="fixed inset-0 z-[200] flex items-end justify-center bg-black/70 backdrop-blur-sm sm:items-center sm:p-4" onClick={onClose} role="dialog" aria-modal="true" aria-label={`Detalle ${order.number}`}>
      <div className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-t-2xl border border-[#2a2a2a] bg-[#0f0f0f] p-5 sm:rounded-2xl" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="font-display text-4xl leading-none text-neon">{order.number}</p>
            <p className="mt-1 text-sm text-neutral-400">{DATE_FMT.format(new Date(order.createdAt))}</p>
          </div>
          <button type="button" onClick={onClose} className="rounded-full border border-[#333] px-3 py-1 text-xs font-bold uppercase tracking-wider text-neutral-300 hover:border-neon hover:text-neon">
            Cerrar
          </button>
        </div>

        <div className="mt-4 flex flex-wrap items-center gap-2 text-sm">
          <span className="font-semibold">{order.customerName}</span>
          <span className="text-neutral-500">{order.customerEmail}</span>
          <span className={`rounded-full px-2.5 py-0.5 text-[11px] font-bold uppercase tracking-wide ${st.cls}`}>{st.label}</span>
        </div>
        <p className="mt-1 text-sm text-neutral-400">{order.shippingMethod === "PICKUP" ? "Retiro en tienda" : `Envío a ${order.shippingComuna || "—"}`}</p>

        <div className="mt-4 space-y-2 rounded-xl border border-[#2a2a2a] p-3">
          {order.items.map((i, k) => (
            <div key={k} className="flex justify-between gap-3 text-sm">
              <span>
                {i.quantity}× {i.productName}
                <span className="block text-xs text-neutral-500">
                  {variant(i)} · Talla {i.sizeLabel} · {formatCLP(i.unitPrice)} c/u
                </span>
              </span>
              <span className="shrink-0 tabular-nums">{formatCLP(i.unitPrice * i.quantity)}</span>
            </div>
          ))}
        </div>

        <h3 className="mt-5 text-xs font-bold uppercase tracking-widest text-neutral-500">Cálculo</h3>
        <dl className="mt-2 space-y-1.5 text-sm tabular-nums">
          <Line k="Productos" v={formatCLP(c.products)} />
          <Line k="Envío cobrado" v={formatCLP(c.shipping)} />
          <Line k="Total cobrado" v={formatCLP(c.gross)} strong />
          <Line k={`Comisión MP (${formatCLP(c.gross)} × 3,7961%)`} v={`− ${formatCLP(c.fee)}`} muted />
          <div className="!mt-3 flex items-baseline justify-between border-t border-[#2a2a2a] pt-3">
            <dt className="font-bold uppercase tracking-wider">Neto recibido</dt>
            <dd className="font-display text-3xl leading-none text-neon">{formatCLP(c.net)}</dd>
          </div>
          <Line k="Neto sin envío" v={formatCLP(c.netProducts)} muted />
        </dl>
        <p className="mt-3 text-xs text-neutral-500">Comisión Mercado Pago {MP_FEE_LABEL} sobre el total (envío incluido), redondeada al peso.</p>
      </div>
    </div>
  );
}

function Line({ k, v, strong, muted }: { k: string; v: string; strong?: boolean; muted?: boolean }) {
  return (
    <div className={`flex justify-between gap-3 ${strong ? "font-bold" : ""} ${muted ? "text-neutral-400" : ""}`}>
      <dt>{k}</dt>
      <dd>{v}</dd>
    </div>
  );
}
