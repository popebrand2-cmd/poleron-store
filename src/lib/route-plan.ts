import { prisma } from "@/lib/prisma";

// Delivery route for the person who takes the orders out: the addresses are located on the map (OpenStreetMap's free
// Nominatim service, at most 1 request per second, each result saved in the order so it is looked up once) and the stops are
// sorted so the total distance is as short as possible (nearest neighbour from every possible start + 2-opt improvement,
// which is plenty for the 5-30 stops of a day).

export type LatLng = { lat: number; lng: number };

const UA = "POPE-store/1.0 (https://popebrand.cl)";
let lastCall = 0;

async function nominatim(query: string): Promise<LatLng | null> {
  // Their usage policy: one request per second at most.
  const wait = lastCall + 1100 - Date.now();
  if (wait > 0) await new Promise((r) => setTimeout(r, wait));
  lastCall = Date.now();
  try {
    const url = `https://nominatim.openstreetmap.org/search?format=jsonv2&limit=1&countrycodes=cl&q=${encodeURIComponent(query)}`;
    const res = await fetch(url, { headers: { "User-Agent": UA, "Accept-Language": "es" }, signal: AbortSignal.timeout(8000), cache: "no-store" });
    if (!res.ok) return null;
    const rows = (await res.json()) as { lat: string; lon: string }[];
    if (!rows[0]) return null;
    return { lat: Number(rows[0].lat), lng: Number(rows[0].lon) };
  } catch {
    return null;
  }
}

// "reinaldo lomboy 994 — Ref: Casa" → "reinaldo lomboy 994"; the apartment/house words confuse the search.
export function streetOf(address: string): string {
  return address
    .split(/\s+[—–]\s+/)[0]
    .replace(/\b(depto|dpto|departamento|casa|block|piso|oficina|of)\b.*$/i, "")
    .replace(/\s+/g, " ")
    .trim()
    .replace(/[,.\s]+$/, "");
}

export async function geocodeText(street: string, comuna: string): Promise<{ point: LatLng; approx: boolean } | null> {
  const s = streetOf(street);
  if (s) {
    const p = await nominatim(`${s}, ${comuna}, Chile`);
    if (p) return { point: p, approx: false };
  }
  if (comuna) {
    const p = await nominatim(`${comuna}, Región Metropolitana, Chile`);
    if (p) return { point: p, approx: true };
  }
  return null;
}

// Locates one order (saved in the order for next time).
export async function locateOrder(order: { id: string; shippingAddr: string; shippingComuna: string; shipLat: number | null; shipLng: number | null; shipGeo: string }): Promise<{ point: LatLng; approx: boolean } | null> {
  if (order.shipLat != null && order.shipLng != null) return { point: { lat: order.shipLat, lng: order.shipLng }, approx: order.shipGeo === "approx" };
  const found = await geocodeText(order.shippingAddr, order.shippingComuna);
  if (!found) {
    await prisma.order.update({ where: { id: order.id }, data: { shipGeo: "none" } }).catch(() => undefined);
    return null;
  }
  await prisma.order.update({ where: { id: order.id }, data: { shipLat: found.point.lat, shipLng: found.point.lng, shipGeo: found.approx ? "approx" : "ok" } }).catch(() => undefined);
  return found;
}

// Straight-line distance in km (haversine), times 1.3 as a rough street factor.
export function km(a: LatLng, b: LatLng): number {
  const R = 6371;
  const toRad = (x: number) => (x * Math.PI) / 180;
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(a.lat)) * Math.cos(toRad(b.lat)) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h)) * 1.3;
}

// Shortest open path through the points (indexes), optionally starting from a fixed `start` point that is not one of them.
export function bestOrder(points: LatLng[], start: LatLng | null): number[] {
  const n = points.length;
  if (n <= 1) return n === 1 ? [0] : [];
  const d = (i: number, j: number) => km(points[i], points[j]);
  const dStart = (j: number) => (start ? km(start, points[j]) : 0);
  const length = (path: number[]) => {
    let t = start ? dStart(path[0]) : 0;
    for (let i = 1; i < path.length; i++) t += d(path[i - 1], path[i]);
    return t;
  };
  const nearest = (first: number) => {
    const left = new Set(Array.from({ length: n }, (_, i) => i));
    const path = [first];
    left.delete(first);
    while (left.size) {
      const last = path[path.length - 1];
      let best = -1;
      let bd = Infinity;
      for (const j of left) {
        const dj = d(last, j);
        if (dj < bd) {
          bd = dj;
          best = j;
        }
      }
      path.push(best);
      left.delete(best);
    }
    return path;
  };
  const improve = (path: number[]) => {
    let better = true;
    let guard = 0;
    while (better && guard++ < 200) {
      better = false;
      for (let i = 0; i < path.length - 1; i++) {
        for (let j = i + 1; j < path.length; j++) {
          const cand = [...path.slice(0, i), ...path.slice(i, j + 1).reverse(), ...path.slice(j + 1)];
          if (length(cand) + 1e-9 < length(path)) {
            path = cand;
            better = true;
          }
        }
      }
    }
    return path;
  };
  // With a fixed start the nearest stop to it goes first; without one every stop is tried as the first.
  const firsts = start ? [Array.from({ length: n }, (_, i) => i).sort((a, b) => dStart(a) - dStart(b))[0]] : Array.from({ length: n }, (_, i) => i);
  let best: number[] = [];
  let bestLen = Infinity;
  for (const f of firsts) {
    const p = improve(nearest(f));
    const l = length(p);
    if (l < bestLen) {
      bestLen = l;
      best = p;
    }
  }
  return best;
}
