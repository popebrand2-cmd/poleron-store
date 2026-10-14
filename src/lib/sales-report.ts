// Period math + aggregation for Admin > Ventas (and its CSV export).
// Everything is computed in Chile time (America/Santiago) so "hoy", "este mes" and the
// daily bars match the owner's calendar, not UTC (which would shift late-night sales a day).

export const TZ = "America/Santiago";

// Orders that count as a real sale. Pending payment and cancelled ones are shown apart.
export const REAL_SALE_STATUSES = ["PAID", "IN_PRODUCTION", "SHIPPED"];

// Mercado Pago "dinero al instante": 3,19% + IVA (19%) = 3,7961%, charged on the full amount the customer paid
// (shipping included). Rounded to the peso per order.
export const MP_FEE_RATE = 0.0319 * 1.19;
export const MP_FEE_LABEL = "3,19% + IVA = 3,7961%";

export function mpFee(total: number): number {
  return Math.round(total * MP_FEE_RATE);
}

export type OrderCalc = { gross: number; shipping: number; products: number; fee: number; net: number; netProducts: number };

/** Total cobrado → comisión MP → neto recibido (and the same net without the shipping that was charged). */
export function calcOrder(o: { totalAmount: number; shippingCost: number }): OrderCalc {
  const fee = mpFee(o.totalAmount);
  const net = o.totalAmount - fee;
  return { gross: o.totalAmount, shipping: o.shippingCost, products: o.totalAmount - o.shippingCost, fee, net, netProducts: net - o.shippingCost };
}

const dayFmt = new Intl.DateTimeFormat("en-CA", { timeZone: TZ, year: "numeric", month: "2-digit", day: "2-digit" });
const partsFmt = new Intl.DateTimeFormat("en-US", {
  timeZone: TZ,
  hourCycle: "h23",
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
  hour: "2-digit",
  minute: "2-digit",
  second: "2-digit",
  weekday: "short",
});

/** YYYY-MM-DD of a moment, in Chile. */
export function chileDay(d: Date): string {
  return dayFmt.format(d);
}

function chileParts(d: Date) {
  const p = Object.fromEntries(partsFmt.formatToParts(d).map((x) => [x.type, x.value]));
  return { year: +p.year, month: +p.month, day: +p.day, hour: +p.hour % 24, minute: +p.minute, second: +p.second, weekday: p.weekday as string };
}

/** Hour (0-23) and weekday (0 = lunes … 6 = domingo) of a moment, in Chile. */
export function chileHourAndWeekday(d: Date): { hour: number; weekday: number } {
  const p = chileParts(d);
  const order = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
  return { hour: p.hour, weekday: Math.max(0, order.indexOf(p.weekday)) };
}

function offsetMs(d: Date): number {
  const p = chileParts(d);
  return Date.UTC(p.year, p.month - 1, p.day, p.hour, p.minute, p.second) - Math.floor(d.getTime() / 1000) * 1000;
}

/** The instant a Chile calendar day (YYYY-MM-DD) starts. */
export function chileMidnight(ymd: string): Date {
  const [y, m, d] = ymd.split("-").map(Number);
  const guess = Date.UTC(y, m - 1, d);
  const first = guess - offsetMs(new Date(guess));
  return new Date(guess - offsetMs(new Date(first)));
}

/** Adds n calendar days to YYYY-MM-DD. */
export function addDays(ymd: string, n: number): string {
  const [y, m, d] = ymd.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d + n)).toISOString().slice(0, 10);
}

function daysBetween(a: string, b: string): number {
  return Math.round((Date.parse(`${b}T00:00:00Z`) - Date.parse(`${a}T00:00:00Z`)) / 86400000);
}

const isYmd = (s: string | undefined): s is string => !!s && /^\d{4}-\d{2}-\d{2}$/.test(s) && !Number.isNaN(Date.parse(s));

export const PERIODS = [
  { key: "hoy", label: "Hoy" },
  { key: "7d", label: "7 días" },
  { key: "30d", label: "30 días" },
  { key: "90d", label: "90 días" },
  { key: "mes", label: "Este mes" },
  { key: "anio", label: "Este año" },
  { key: "todo", label: "Todo" },
] as const;

export type Range = {
  key: string;
  label: string;
  // Inclusive first day / last day, Chile calendar (YYYY-MM-DD).
  fromDay: string;
  toDay: string;
  start: Date; // instant, inclusive
  end: Date; // instant, exclusive
  prev: { start: Date; end: Date; label: string } | null;
};

/**
 * Resolves ?periodo= (or ?desde=&hasta=) into concrete instants. "todo" starts at the first
 * order ever (firstOrderAt) and has no comparison period.
 */
export function resolveRange(params: { periodo?: string; desde?: string; hasta?: string }, firstOrderAt: Date | null, now = new Date()): Range {
  const today = chileDay(now);

  if (isYmd(params.desde) && isYmd(params.hasta)) {
    let [fromDay, toDay] = [params.desde, params.hasta];
    if (fromDay > toDay) [fromDay, toDay] = [toDay, fromDay];
    const len = daysBetween(fromDay, toDay) + 1;
    const start = chileMidnight(fromDay);
    const end = chileMidnight(addDays(toDay, 1));
    const prevFrom = addDays(fromDay, -len);
    return {
      key: "custom",
      label: `${fmtDay(fromDay)} al ${fmtDay(toDay)}`,
      fromDay,
      toDay,
      start,
      end,
      prev: { start: chileMidnight(prevFrom), end: start, label: `${fmtDay(prevFrom)} al ${fmtDay(addDays(fromDay, -1))}` },
    };
  }

  const key = PERIODS.some((p) => p.key === params.periodo) ? params.periodo! : "30d";
  const label = PERIODS.find((p) => p.key === key)!.label;
  const end = now;
  let fromDay: string;

  switch (key) {
    case "hoy":
      fromDay = today;
      break;
    case "7d":
      fromDay = addDays(today, -6);
      break;
    case "90d":
      fromDay = addDays(today, -89);
      break;
    case "mes":
      fromDay = `${today.slice(0, 7)}-01`;
      break;
    case "anio":
      fromDay = `${today.slice(0, 4)}-01-01`;
      break;
    case "todo":
      fromDay = firstOrderAt ? chileDay(firstOrderAt) : today;
      break;
    default:
      fromDay = addDays(today, -29);
  }

  const start = chileMidnight(fromDay);
  let prev: Range["prev"] = null;

  if (key === "mes") {
    // Same stretch of last month (1st up to the same moment), so a half month is compared with a half month.
    const [y, m] = fromDay.split("-").map(Number);
    const prevFrom = new Date(Date.UTC(y, m - 2, 1)).toISOString().slice(0, 10);
    const prevStart = chileMidnight(prevFrom);
    prev = { start: prevStart, end: new Date(Math.min(prevStart.getTime() + (end.getTime() - start.getTime()), start.getTime())), label: "mismo tramo del mes pasado" };
  } else if (key === "anio") {
    const prevFrom = `${+fromDay.slice(0, 4) - 1}-01-01`;
    const prevStart = chileMidnight(prevFrom);
    prev = { start: prevStart, end: new Date(prevStart.getTime() + (end.getTime() - start.getTime())), label: "mismo tramo del año pasado" };
  } else if (key === "hoy") {
    const y = chileMidnight(addDays(today, -1));
    prev = { start: y, end: new Date(y.getTime() + (end.getTime() - start.getTime())), label: "ayer a esta hora" };
  } else if (key !== "todo") {
    const len = daysBetween(fromDay, today) + 1;
    const prevFrom = addDays(fromDay, -len);
    prev = { start: chileMidnight(prevFrom), end: start, label: `${len} días anteriores` };
  }

  return { key, label, fromDay, toDay: today, start, end, prev };
}

const MONTHS = ["ene", "feb", "mar", "abr", "may", "jun", "jul", "ago", "sep", "oct", "nov", "dic"];

export function fmtDay(ymd: string): string {
  const [y, m, d] = ymd.split("-").map(Number);
  return `${d} ${MONTHS[m - 1]} ${y}`;
}

/** Buckets for the sales chart: one per day up to ~3 months, one per month beyond that. */
export function buckets(range: Range): { key: string; label: string }[] {
  const len = daysBetween(range.fromDay, range.toDay) + 1;
  if (len <= 93) {
    return Array.from({ length: len }, (_, i) => {
      const d = addDays(range.fromDay, i);
      return { key: d, label: `${+d.slice(8)}/${+d.slice(5, 7)}` };
    });
  }
  const out: { key: string; label: string }[] = [];
  let [y, m] = range.fromDay.split("-").map(Number);
  const [ty, tm] = range.toDay.split("-").map(Number);
  while (y < ty || (y === ty && m <= tm)) {
    out.push({ key: `${y}-${String(m).padStart(2, "0")}`, label: `${MONTHS[m - 1]} ${String(y).slice(2)}` });
    m++;
    if (m > 12) {
      m = 1;
      y++;
    }
  }
  return out;
}

export function bucketKeyFor(d: Date, monthly: boolean): string {
  const day = chileDay(d);
  return monthly ? day.slice(0, 7) : day;
}

/** "+12%" style change vs. the previous period; null when there is nothing to compare with. */
export function pctChange(current: number, previous: number | null | undefined): number | null {
  if (previous == null) return null;
  if (previous === 0) return current === 0 ? 0 : null;
  return Math.round(((current - previous) / previous) * 100);
}

/** Last path segment of an uploaded file URL, to match a sold design against the collection designs. */
export function fileKey(url: string | undefined | null): string {
  if (!url) return "";
  const clean = url.split("?")[0].split("#")[0];
  return decodeURIComponent(clean.slice(clean.lastIndexOf("/") + 1)).toLowerCase();
}

export type Ranked = { label: string; units: number; amount: number };

/** Adds units/amount under a label; returns the map sorted by amount then units. */
export class Tally {
  private m = new Map<string, Ranked>();
  add(label: string, units: number, amount: number) {
    const k = label || "Sin dato";
    const r = this.m.get(k) ?? { label: k, units: 0, amount: 0 };
    r.units += units;
    r.amount += amount;
    this.m.set(k, r);
  }
  sorted(by: "amount" | "units" = "amount"): Ranked[] {
    return [...this.m.values()].sort((a, b) => b[by] - a[by] || b.units - a.units);
  }
}
