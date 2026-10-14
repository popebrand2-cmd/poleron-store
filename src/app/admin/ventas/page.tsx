import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { formatCLP } from "@/lib/money";
import { formatOrderNumber } from "@/lib/order-number";
import AdminNav from "@/components/admin/AdminNav";
import BarChart from "@/components/admin/BarChart";
import AutoRefresh from "@/components/admin/AutoRefresh";
import SalesStackedChart from "@/components/admin/SalesStackedChart";
import SalesOrdersTable, { type SaleRow } from "@/components/admin/SalesOrdersTable";
import {
  MP_FEE_LABEL,
  PERIODS,
  REAL_SALE_STATUSES,
  calcOrder,
  Tally,
  bucketKeyFor,
  buckets,
  chileHourAndWeekday,
  fileKey,
  fmtDay,
  pctChange,
  resolveRange,
  type Ranked,
} from "@/lib/sales-report";

export const dynamic = "force-dynamic";

const WEEKDAYS = ["Lun", "Mar", "Mié", "Jue", "Vie", "Sáb", "Dom"];
const STATUS_LABELS: Record<string, string> = {
  PAID: "Pagado, por hacer",
  IN_PRODUCTION: "En producción",
  SHIPPED: "Terminado",
};

type SP = Promise<{ periodo?: string; desde?: string; hasta?: string }>;

export default async function AdminSalesPage({ searchParams }: { searchParams: SP }) {
  const params = await searchParams;
  const first = await prisma.order.findFirst({ orderBy: { createdAt: "asc" }, select: { createdAt: true } });
  const range = resolveRange(params, first?.createdAt ?? null);

  const itemSelect = {
    quantity: true,
    unitPrice: true,
    colorName: true,
    sizeLabel: true,
    materialLabel: true,
    designPlacement: true,
    product: { select: { name: true } },
  } as const;

  const [orders, prevOrders, presets] = await Promise.all([
    prisma.order.findMany({
      where: { createdAt: { gte: range.start, lt: range.end } },
      orderBy: { createdAt: "desc" },
      include: { items: { select: itemSelect } },
    }),
    range.prev
      ? prisma.order.findMany({
          where: { createdAt: { gte: range.prev.start, lt: range.prev.end }, status: { in: REAL_SALE_STATUSES } },
          select: { totalAmount: true, shippingCost: true, customerEmail: true, items: { select: { quantity: true } } },
        })
      : Promise.resolve(null),
    prisma.presetDesign.findMany({ select: { name: true, imageUrl: true, backImageUrl: true, collection: { select: { name: true } } } }),
  ]);

  const sales = orders.filter((o) => REAL_SALE_STATUSES.includes(o.status));
  const pending = orders.filter((o) => o.status === "PENDING_PAYMENT");
  const cancelled = orders.filter((o) => o.status === "CANCELLED");

  // ---- Headline numbers -------------------------------------------------
  const revenue = sum(sales.map((o) => o.totalAmount));
  const shipping = sum(sales.map((o) => o.shippingCost));
  const units = sum(sales.flatMap((o) => o.items.map((i) => i.quantity)));
  const avgTicket = sales.length ? Math.round(revenue / sales.length) : 0;
  const customers = new Set(sales.map((o) => o.customerEmail.trim().toLowerCase())).size;
  // Mercado Pago fee per order (3,19% + IVA over the total, shipping included) and what actually reaches the account.
  const fee = sum(sales.map((o) => calcOrder(o).fee));
  const net = revenue - fee;

  const prev = prevOrders
    ? {
        revenue: sum(prevOrders.map((o) => o.totalAmount)),
        net: sum(prevOrders.map((o) => calcOrder(o).net)),
        orders: prevOrders.length,
        units: sum(prevOrders.flatMap((o) => o.items.map((i) => i.quantity))),
        avgTicket: prevOrders.length ? Math.round(sum(prevOrders.map((o) => o.totalAmount)) / prevOrders.length) : 0,
        customers: new Set(prevOrders.map((o) => o.customerEmail.trim().toLowerCase())).size,
      }
    : null;

  // ---- Chart ------------------------------------------------------------
  const bks = buckets(range);
  const monthly = bks[0]?.key.length === 7;
  const byBucket = new Map(bks.map((b) => [b.key, { amount: 0, count: 0, net: 0, shipping: 0 }]));
  for (const o of sales) {
    const b = byBucket.get(bucketKeyFor(o.createdAt, monthly));
    if (b) {
      const c = calcOrder(o);
      b.amount += o.totalAmount;
      b.count += 1;
      b.net += c.net;
      b.shipping += c.shipping;
    }
  }
  const netChart = bks.map((b) => {
    const v = byBucket.get(b.key)!;
    return { label: b.label, netProducts: v.net - v.shipping, shipping: v.shipping, orders: v.count };
  });
  const ordersChart = bks.map((b) => ({ label: b.label, value: byBucket.get(b.key)!.count }));
  const bestBucket = [...bks].sort((a, b) => byBucket.get(b.key)!.net - byBucket.get(a.key)!.net)[0];
  const bestBucketAmount = bestBucket ? byBucket.get(bestBucket.key)!.net : 0;

  // ---- What sold --------------------------------------------------------
  const presetByFile = new Map<string, { name: string; collection: string }>();
  for (const p of presets) {
    for (const url of [p.imageUrl, p.backImageUrl]) {
      const k = fileKey(url);
      if (k) presetByFile.set(k, { name: p.name, collection: p.collection.name });
    }
  }

  const products = new Tally();
  const sizes = new Tally();
  const colors = new Tally();
  const materials = new Tally();
  const collections = new Tally();
  const designs = new Tally();
  for (const o of sales) {
    for (const it of o.items) {
      const amount = it.unitPrice * it.quantity;
      products.add(it.product.name, it.quantity, amount);
      sizes.add(it.sizeLabel, it.quantity, amount);
      colors.add(it.colorName, it.quantity, amount);
      if (it.materialLabel) materials.add(it.materialLabel, it.quantity, amount);

      let placement: Record<string, { designUrl?: string; originalDesignUrl?: string }> = {};
      try {
        placement = JSON.parse(it.designPlacement || "{}");
      } catch {
        // old/garbled row: counted as custom below
      }
      const match = Object.values(placement)
        .map((v) => presetByFile.get(fileKey(v?.designUrl)) ?? presetByFile.get(fileKey(v?.originalDesignUrl)))
        .find(Boolean);
      if (match) {
        collections.add(match.collection, it.quantity, amount);
        designs.add(`${match.name} · ${match.collection}`, it.quantity, amount);
      } else {
        collections.add(Object.keys(placement).length ? "Diseño propio del cliente" : "Sin diseño", it.quantity, amount);
      }
    }
  }

  // ---- How / where / when -----------------------------------------------
  const pickup = sales.filter((o) => o.shippingMethod === "PICKUP");
  const delivery = sales.filter((o) => o.shippingMethod !== "PICKUP");
  const comunas = new Tally();
  for (const o of delivery) comunas.add(o.shippingComuna, 1, o.totalAmount);

  const weekday = Array.from({ length: 7 }, () => 0);
  const hours = Array.from({ length: 24 }, () => 0);
  for (const o of sales) {
    const { hour, weekday: wd } = chileHourAndWeekday(o.createdAt);
    weekday[wd] += o.totalAmount;
    hours[hour] += 1;
  }

  // ---- Customers --------------------------------------------------------
  const byCustomer = new Map<string, { name: string; orders: number; amount: number }>();
  for (const o of sales) {
    const k = o.customerEmail.trim().toLowerCase();
    const c = byCustomer.get(k) ?? { name: o.customerName, orders: 0, amount: 0 };
    c.orders += 1;
    c.amount += o.totalAmount;
    byCustomer.set(k, c);
  }
  const repeatCustomers = [...byCustomer.values()].filter((c) => c.orders > 1).length;
  const topCustomers = [...byCustomer.values()].sort((a, b) => b.amount - a.amount).slice(0, 5);

  const statusCounts = Object.keys(STATUS_LABELS).map((s) => ({
    status: s,
    count: sales.filter((o) => o.status === s).length,
    amount: sum(sales.filter((o) => o.status === s).map((o) => o.totalAmount)),
  }));

  const tableRows: SaleRow[] = sales.map((o) => ({
    id: o.id,
    number: formatOrderNumber(o),
    createdAt: o.createdAt.toISOString(),
    status: o.status,
    customerName: o.customerName,
    customerEmail: o.customerEmail,
    shippingMethod: o.shippingMethod,
    shippingComuna: o.shippingComuna,
    shippingCost: o.shippingCost,
    totalAmount: o.totalAmount,
    items: o.items.map((i) => ({
      productName: i.product.name,
      colorName: i.colorName,
      materialLabel: i.materialLabel,
      sizeLabel: i.sizeLabel,
      quantity: i.quantity,
      unitPrice: i.unitPrice,
    })),
  }));

  const exportQs = range.key === "custom" ? `desde=${range.fromDay}&hasta=${range.toDay}` : `periodo=${range.key}`;

  return (
    <main className="mx-auto max-w-6xl p-4 sm:p-6">
      <AutoRefresh seconds={20} />
      <div className="mb-6 flex flex-col items-start gap-3 sm:flex-row sm:items-center sm:justify-between">
        <h1 className="text-2xl font-semibold">Ventas</h1>
        <AdminNav current="/admin/ventas" />
      </div>

      {/* Period picker */}
      <div className="mb-6 flex flex-col gap-3 rounded-xl border border-neutral-200 bg-white p-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-wrap gap-1.5">
          {PERIODS.map((p) => (
            <Link
              key={p.key}
              href={`/admin/ventas?periodo=${p.key}`}
              className={`rounded-full px-3 py-1 text-sm font-medium ${range.key === p.key ? "bg-neutral-900 text-white" : "bg-neutral-100 text-neutral-700 hover:bg-neutral-200"}`}
            >
              {p.label}
            </Link>
          ))}
        </div>
        <form action="/admin/ventas" className="flex flex-wrap items-center gap-2 text-sm">
          <input type="date" name="desde" defaultValue={range.fromDay} className="rounded-md border border-neutral-300 px-2 py-1" />
          <span className="text-neutral-500">al</span>
          <input type="date" name="hasta" defaultValue={range.toDay} className="rounded-md border border-neutral-300 px-2 py-1" />
          <button className="rounded-md bg-neutral-900 px-3 py-1 font-medium text-white">Ver</button>
        </form>
      </div>

      <div className="mb-4 flex flex-wrap items-baseline justify-between gap-2">
        <p className="text-sm text-neutral-600">
          {fmtDay(range.fromDay)} al {fmtDay(range.toDay)}
          {range.prev && <span className="text-neutral-400"> · comparado con {range.prev.label}</span>}
        </p>
        <a href={`/api/admin/ventas/export?${exportQs}`} className="text-sm font-medium text-neutral-700 underline">
          Descargar Excel (CSV)
        </a>
      </div>

      {/* Net received: the headline */}
      <div className="mb-3 grid gap-3 lg:grid-cols-[1.3fr_2fr]">
        <div className="rounded-2xl border bg-[#111] p-5" style={{ borderColor: "color-mix(in srgb, var(--neon) 45%, transparent)" }}>
          <p className="text-xs font-bold uppercase tracking-widest text-neutral-400">Neto recibido</p>
          <p className="mt-1 font-display text-6xl font-semibold leading-none text-neon">{formatCLP(net)}</p>
          <Delta value={pctChange(net, prev?.net)} />
          <p className="mt-3 text-sm text-neutral-400">
            Ventas brutas {formatCLP(revenue)} − comisión MP {formatCLP(fee)}
          </p>
          <p className="mt-1 text-xs text-neutral-500">Comisión Mercado Pago: {MP_FEE_LABEL} sobre el total cobrado, envío incluido.</p>
        </div>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          <Kpi label="Ventas brutas" value={formatCLP(revenue)} delta={pctChange(revenue, prev?.revenue)} />
          <Kpi label="Comisión MP" value={`− ${formatCLP(fee)}`} delta={null} />
          <Kpi label="Envíos cobrados" value={formatCLP(shipping)} delta={null} note={`Neto sin envíos ${formatCLP(net - shipping)}`} />
        </div>
      </div>

      <div className="mb-8 grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Kpi label="Ticket promedio" value={formatCLP(avgTicket)} delta={pctChange(avgTicket, prev?.avgTicket)} />
        <Kpi label="Pedidos pagados" value={fmtN(sales.length)} delta={pctChange(sales.length, prev?.orders)} />
        <Kpi label="Prendas vendidas" value={fmtN(units)} delta={pctChange(units, prev?.units)} />
        <Kpi label="Clientes" value={fmtN(customers)} delta={pctChange(customers, prev?.customers)} />
      </div>

      <div className="mb-8 grid gap-3 sm:grid-cols-3">
        <Mini label="Venta de productos" value={formatCLP(revenue - shipping)} note={`+ ${formatCLP(shipping)} cobrado en envíos`} />
        <Mini
          label="Pendientes de pago"
          value={`${fmtN(pending.length)} · ${formatCLP(sum(pending.map((o) => o.totalAmount)))}`}
          note="Llegaron al pago y no pagaron (o el pago no se confirmó)"
        />
        <Mini label="Cancelados" value={`${fmtN(cancelled.length)} · ${formatCLP(sum(cancelled.map((o) => o.totalAmount)))}`} note="No suman en ventas" />
      </div>

      <Section title={monthly ? "Neto recibido por mes" : "Neto recibido por día"}>
        <SalesStackedChart data={netChart} unit={monthly ? "mes" : "día"} />
        {bestBucketAmount > 0 && (
          <p className="mt-2 text-xs text-neutral-500">
            Mejor {monthly ? "mes" : "día"}: {bestBucket.label} con {formatCLP(bestBucketAmount)}
          </p>
        )}
      </Section>

      <Section title={monthly ? "Pedidos pagados por mes" : "Pedidos pagados por día"}>
        <BarChart data={ordersChart} color="var(--neon)" />
      </Section>

      <div className="grid gap-x-6 md:grid-cols-2">
        <Section title="Productos más vendidos">
          <Ranking rows={products.sorted()} />
        </Section>
        <Section title="Colecciones y diseños">
          <Ranking rows={collections.sorted()} />
        </Section>
        <Section title="Diseños de colección más vendidos">
          <Ranking rows={designs.sorted("units").slice(0, 10)} empty="Ningún diseño de colección vendido en este período." />
        </Section>
        <Section title="Tallas">
          <Ranking rows={sizes.sorted("units")} by="units" />
        </Section>
        <Section title="Colores">
          <Ranking rows={colors.sorted("units")} by="units" />
        </Section>
        {materials.sorted().length > 0 && (
          <Section title="Técnica de estampado">
            <Ranking rows={materials.sorted("units")} by="units" />
          </Section>
        )}
        <Section title="Retiro vs. envío">
          <Ranking
            rows={[
              { label: "Envío a domicilio", units: delivery.length, amount: sum(delivery.map((o) => o.totalAmount)) },
              { label: "Retiro en tienda", units: pickup.length, amount: sum(pickup.map((o) => o.totalAmount)) },
            ]}
            unitWord="pedido"
          />
        </Section>
        <Section title="Comunas con más envíos">
          <Ranking rows={comunas.sorted("units").slice(0, 10)} by="units" unitWord="pedido" empty="Sin envíos a domicilio en este período." />
        </Section>
        <Section title="Ventas por día de la semana">
          <BarChart data={WEEKDAYS.map((d, i) => ({ label: d, value: weekday[i] }))} color="var(--neon)" formatValue={(v) => shortCLP(v)} />
        </Section>
        <Section title="Hora de compra (pedidos)">
          <BarChart data={hours.map((v, h) => ({ label: `${h}h`, value: v }))} color="var(--neon)" />
        </Section>
        <Section title="Estado de los pedidos pagados">
          <div className="divide-y divide-neutral-100 text-sm">
            {statusCounts.map((s) => (
              <div key={s.status} className="flex items-center justify-between py-2">
                <span className="text-neutral-700">{STATUS_LABELS[s.status]}</span>
                <span className="tabular-nums text-neutral-500">
                  {fmtN(s.count)} · {formatCLP(s.amount)}
                </span>
              </div>
            ))}
          </div>
        </Section>
        <Section title="Mejores clientes">
          {topCustomers.length === 0 ? (
            <p className="text-sm text-neutral-500">Sin ventas en este período.</p>
          ) : (
            <>
              <div className="divide-y divide-neutral-100 text-sm">
                {topCustomers.map((c, i) => (
                  <div key={i} className="flex items-center justify-between gap-3 py-2">
                    <span className="truncate text-neutral-700">{c.name}</span>
                    <span className="shrink-0 tabular-nums text-neutral-500">
                      {c.orders} pedido{c.orders === 1 ? "" : "s"} · {formatCLP(c.amount)}
                    </span>
                  </div>
                ))}
              </div>
              <p className="mt-2 text-xs text-neutral-500">
                {fmtN(repeatCustomers)} de {fmtN(customers)} cliente{customers === 1 ? "" : "s"} compró más de una vez en el período.
              </p>
            </>
          )}
        </Section>
      </div>

      <Section title={`Pedidos del período (${fmtN(sales.length)})`}>
        <SalesOrdersTable orders={tableRows} />
      </Section>

      <p className="mt-6 text-xs text-neutral-400">
        Ventas = pedidos pagados, en producción o terminados (incluye el envío cobrado); no suman los pendientes de pago ni los cancelados. Neto = total cobrado − comisión Mercado Pago ({MP_FEE_LABEL}, envío incluido). Fechas y horas en hora de Chile. Esta página se actualiza sola cada 20 segundos.
      </p>
    </main>
  );
}

function sum(xs: number[]): number {
  return xs.reduce((a, b) => a + b, 0);
}

function fmtN(n: number): string {
  return n.toLocaleString("es-CL");
}

function shortCLP(v: number): string {
  if (v >= 1_000_000) return `$${(v / 1_000_000).toFixed(1).replace(".", ",")}M`;
  if (v >= 1_000) return `$${Math.round(v / 1_000)}k`;
  return `$${v}`;
}

function Kpi({ label, value, delta, note }: { label: string; value: string; delta: number | null; note?: string }) {
  return (
    <div className="rounded-xl border border-neutral-200 bg-white p-4">
      <p className="text-xs font-medium uppercase tracking-wide text-neutral-500">{label}</p>
      <p className="mt-1 font-display text-2xl font-medium leading-none tabular-nums sm:text-3xl">{value}</p>
      <Delta value={delta} />
      {note && <p className="mt-1 text-xs text-neutral-500">{note}</p>}
    </div>
  );
}

function Delta({ value }: { value: number | null }) {
  if (value === null) return null;
  return (
    <p className={`mt-1 text-xs font-medium ${value > 0 ? "text-neon" : value < 0 ? "text-red-600" : "text-neutral-400"}`}>
      {value > 0 ? "▲" : value < 0 ? "▼" : "="} {Math.abs(value)}% vs. antes
    </p>
  );
}

function Mini({ label, value, note }: { label: string; value: string; note: string }) {
  return (
    <div className="rounded-xl border border-neutral-200 bg-neutral-50 p-3">
      <p className="text-xs font-medium text-neutral-500">{label}</p>
      <p className="mt-0.5 font-semibold tabular-nums">{value}</p>
      <p className="mt-0.5 text-xs text-neutral-400">{note}</p>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="mb-6">
      <h2 className="mb-2 text-sm font-semibold uppercase tracking-wide text-neutral-600">{title}</h2>
      <div className="rounded-xl border border-neutral-200 bg-white p-4">{children}</div>
    </div>
  );
}

function Ranking({
  rows,
  by = "amount",
  unitWord = "prenda",
  empty = "Sin ventas en este período.",
}: {
  rows: Ranked[];
  by?: "amount" | "units";
  unitWord?: string;
  empty?: string;
}) {
  if (rows.length === 0 || rows.every((r) => r.units === 0)) return <p className="text-sm text-neutral-500">{empty}</p>;
  const max = Math.max(1, ...rows.map((r) => r[by]));
  const total = sum(rows.map((r) => r[by]));
  return (
    <div className="space-y-2.5">
      {rows.map((r) => (
        <div key={r.label}>
          <div className="mb-1 flex items-baseline justify-between gap-3 text-sm">
            <span className="truncate text-neutral-800">{r.label}</span>
            <span className="shrink-0 tabular-nums text-neutral-500">
              {fmtN(r.units)} {unitWord}
              {r.units === 1 ? "" : "s"} · {formatCLP(r.amount)}
              <span className="ml-1 text-neutral-400">({Math.round((r[by] / Math.max(1, total)) * 100)}%)</span>
            </span>
          </div>
          <div className="h-1.5 rounded-full bg-neutral-100">
            <div className="h-1.5 rounded-full bg-neon" style={{ width: `${(r[by] / max) * 100}%` }} />
          </div>
        </div>
      ))}
    </div>
  );
}
