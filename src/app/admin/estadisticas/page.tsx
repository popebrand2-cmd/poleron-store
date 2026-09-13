import { prisma } from "@/lib/prisma";
import { formatCLP } from "@/lib/money";
import AdminNav from "@/components/admin/AdminNav";
import BarChart from "@/components/admin/BarChart";
import { lastNDays, countByDay, uniqueByDay, sumByDay } from "@/lib/analytics";

export const dynamic = "force-dynamic";

// "Ventas reales" excluye pedidos pendientes de pago o cancelados.
const REAL_SALE_STATUSES = ["PAID", "IN_PRODUCTION", "SHIPPED"];

export default async function AdminStatsPage() {
  const days = lastNDays(30);
  const since = new Date(`${days[0]}T00:00:00.000Z`);

  const [visits, orders, totalVisitsAllTime, revenueAggAllTime] = await Promise.all([
    prisma.visit.findMany({
      where: { createdAt: { gte: since } },
      select: { createdAt: true, visitorId: true, path: true },
    }),
    prisma.order.findMany({
      where: { createdAt: { gte: since } },
      select: { createdAt: true, totalAmount: true, status: true },
    }),
    prisma.visit.count(),
    prisma.order.aggregate({
      where: { status: { in: REAL_SALE_STATUSES } },
      _sum: { totalAmount: true },
      _count: true,
    }),
  ]);

  const realSales = orders.filter((o) => REAL_SALE_STATUSES.includes(o.status));

  const pageviewsChart = countByDay(
    visits.map((v) => v.createdAt),
    days,
  );
  const uniqueVisitorsChart = uniqueByDay(visits, days);
  const salesChart = sumByDay(
    realSales.map((o) => ({ createdAt: o.createdAt, amount: o.totalAmount })),
    days,
  );
  const ordersChart = countByDay(
    realSales.map((o) => o.createdAt),
    days,
  );

  const uniqueVisitors30d = new Set(visits.map((v) => v.visitorId)).size;
  const revenue30d = realSales.reduce((sum, o) => sum + o.totalAmount, 0);

  const topPaths = Object.entries(
    visits.reduce<Record<string, number>>((acc, v) => {
      const path = v.path || "/";
      acc[path] = (acc[path] ?? 0) + 1;
      return acc;
    }, {}),
  )
    .sort((a, b) => b[1] - a[1])
    .slice(0, 8);

  return (
    <main className="mx-auto max-w-5xl p-6">
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Estadísticas</h1>
        <AdminNav current="/admin/estadisticas" />
      </div>

      <div className="mb-8 grid grid-cols-2 gap-4 sm:grid-cols-4">
        <StatCard label="Visitas (30 días)" value={visits.length.toLocaleString("es-CL")} />
        <StatCard label="Visitantes únicos (30 días)" value={uniqueVisitors30d.toLocaleString("es-CL")} />
        <StatCard label="Ventas (30 días)" value={formatCLP(revenue30d)} />
        <StatCard label="Pedidos pagados (30 días)" value={realSales.length.toLocaleString("es-CL")} />
      </div>

      <Section title="Visitas por día (últimos 30 días)">
        <BarChart data={pageviewsChart} color="#171717" />
      </Section>

      <Section title="Visitantes únicos por día">
        <BarChart data={uniqueVisitorsChart} color="#0ea5e9" />
      </Section>

      <Section title="Ventas por día (CLP)">
        <BarChart data={salesChart} color="#16a34a" formatValue={(v) => formatCLP(v)} />
      </Section>

      <Section title="Pedidos pagados por día">
        <BarChart data={ordersChart} color="#a855f7" />
      </Section>

      <Section title="Páginas más visitadas (últimos 30 días)">
        {topPaths.length === 0 ? (
          <p className="text-sm text-neutral-500">Sin datos todavía.</p>
        ) : (
          <div className="divide-y divide-neutral-200">
            {topPaths.map(([path, count]) => (
              <div key={path} className="flex items-center justify-between py-2 text-sm">
                <span className="font-mono text-neutral-700">{path}</span>
                <span className="text-neutral-500">{count} visita(s)</span>
              </div>
            ))}
          </div>
        )}
      </Section>

      <p className="mt-8 text-xs text-neutral-400">
        Total histórico: {totalVisitsAllTime.toLocaleString("es-CL")} visitas registradas ·{" "}
        {(revenueAggAllTime._count ?? 0).toLocaleString("es-CL")} pedidos pagados ·{" "}
        {formatCLP(revenueAggAllTime._sum.totalAmount ?? 0)} en ventas totales.
      </p>
    </main>
  );
}

function StatCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-neutral-200 bg-white p-4">
      <p className="text-xs font-medium uppercase tracking-wide text-neutral-500">{label}</p>
      <p className="mt-1 text-2xl font-semibold">{value}</p>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="mb-8">
      <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-neutral-600">{title}</h2>
      <div className="rounded-xl border border-neutral-200 bg-white p-4">{children}</div>
    </div>
  );
}
