// Small pure helpers for turning raw rows into daily chart series, used by
// /admin/estadisticas. Kept dependency-free — the data volumes here (a
// single store's visits/orders) don't need a real analytics/SQL pipeline.

export function lastNDays(n: number): string[] {
  const days: string[] = [];
  const now = new Date();
  for (let i = n - 1; i >= 0; i--) {
    const d = new Date(now);
    d.setUTCDate(d.getUTCDate() - i);
    days.push(d.toISOString().slice(0, 10));
  }
  return days;
}

function dayKey(date: Date): string {
  return date.toISOString().slice(0, 10);
}

export function countByDay(dates: Date[], days: string[]): { label: string; value: number }[] {
  const counts = new Map(days.map((d) => [d, 0]));
  for (const date of dates) {
    const key = dayKey(date);
    if (counts.has(key)) counts.set(key, (counts.get(key) ?? 0) + 1);
  }
  return days.map((d) => ({ label: d.slice(5), value: counts.get(d) ?? 0 }));
}

export function uniqueByDay(
  rows: { createdAt: Date; visitorId: string }[],
  days: string[],
): { label: string; value: number }[] {
  const sets = new Map(days.map((d) => [d, new Set<string>()]));
  for (const r of rows) {
    sets.get(dayKey(r.createdAt))?.add(r.visitorId);
  }
  return days.map((d) => ({ label: d.slice(5), value: sets.get(d)?.size ?? 0 }));
}

export function sumByDay(
  rows: { createdAt: Date; amount: number }[],
  days: string[],
): { label: string; value: number }[] {
  const sums = new Map(days.map((d) => [d, 0]));
  for (const r of rows) {
    sums.set(dayKey(r.createdAt), (sums.get(dayKey(r.createdAt)) ?? 0) + r.amount);
  }
  return days.map((d) => ({ label: d.slice(5), value: sums.get(d) ?? 0 }));
}
