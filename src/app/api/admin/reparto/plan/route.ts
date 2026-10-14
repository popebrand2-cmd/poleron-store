import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { formatOrderNumber } from "@/lib/order-number";
import { bestOrder, geocodeText, km, locateOrder, streetOf, type LatLng } from "@/lib/route-plan";

export const maxDuration = 120;

const bodySchema = z.object({ orderIds: z.array(z.string()).min(1).max(40), startAddress: z.string().trim().max(200).default("") });

type Stop = {
  orderId: string;
  number: string;
  name: string;
  phone: string;
  address: string;
  comuna: string;
  note: string;
  approx: boolean;
  legKm: number;
  items: string[];
  mapsText: string;
};

// Sorts the chosen delivery orders into the shortest route. Orders that cannot be located at all go last, marked.
export async function POST(request: Request) {
  const parsed = bodySchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Elige al menos un pedido." }, { status: 400 });
  const { orderIds, startAddress } = parsed.data;

  const orders = await prisma.order.findMany({
    where: { id: { in: orderIds }, shippingMethod: "DELIVERY" },
    include: { items: { include: { product: { select: { name: true } } } } },
  });
  if (orders.length === 0) return NextResponse.json({ error: "Ninguno de los pedidos elegidos es de envío a domicilio." }, { status: 400 });

  // Start of the route (the workshop / pickup point), if it can be located.
  let start: LatLng | null = null;
  let startLabel = "";
  const settings = await prisma.storeSettings.findUnique({ where: { id: "singleton" } });
  const startText = startAddress || settings?.pickupAddress || "";
  if (startText) {
    const g = await geocodeText(startText, "");
    if (g) {
      start = g.point;
      startLabel = startText;
    }
  }

  const located: { order: (typeof orders)[number]; point: LatLng; approx: boolean }[] = [];
  const lost: (typeof orders)[number][] = [];
  for (const o of orders) {
    const r = await locateOrder(o);
    if (r) located.push({ order: o, point: r.point, approx: r.approx });
    else lost.push(o);
  }

  const order = bestOrder(
    located.map((l) => l.point),
    start,
  );
  const sorted = order.map((i) => located[i]);

  const itemsOf = (o: (typeof orders)[number]) => o.items.map((it) => `${it.quantity}× ${it.product.name} — ${it.colorName}${it.sizeLabel ? ` · Talla ${it.sizeLabel}` : ""}`);
  const stops: Stop[] = [];
  let prev: LatLng | null = start;
  for (const s of sorted) {
    stops.push({
      orderId: s.order.id,
      number: formatOrderNumber(s.order),
      name: s.order.customerName,
      phone: s.order.customerPhone,
      address: s.order.shippingAddr,
      comuna: s.order.shippingComuna,
      note: (s.order.shippingAddr.split(/\s+[—–]\s+/)[1] ?? "").trim(),
      approx: s.approx,
      legKm: prev ? Math.round(km(prev, s.point) * 10) / 10 : 0,
      items: itemsOf(s.order),
      mapsText: `${streetOf(s.order.shippingAddr)}, ${s.order.shippingComuna}, Chile`,
    });
    prev = s.point;
  }
  for (const o of lost) {
    stops.push({
      orderId: o.id,
      number: formatOrderNumber(o),
      name: o.customerName,
      phone: o.customerPhone,
      address: o.shippingAddr,
      comuna: o.shippingComuna,
      note: "No se pudo ubicar en el mapa: revisa la dirección.",
      approx: true,
      legKm: 0,
      items: itemsOf(o),
      mapsText: `${streetOf(o.shippingAddr)}, ${o.shippingComuna}, Chile`,
    });
  }

  // Google Maps links with the stops already in the best order, for the driver's phone. Google only accepts 3 intermediate
  // stops per link when it opens in a phone's browser, so the route goes in legs of up to 4 stops; each leg starts where the
  // previous one ended. The first leg has no origin: Maps starts from wherever the driver is (the route was calculated from
  // the workshop, which is where they leave from).
  const links: { label: string; url: string }[] = [];
  const plain = stops.filter((s) => !s.note.startsWith("No se pudo"));
  const CHUNK = 4;
  for (let i = 0; i < plain.length; i += CHUNK) {
    const part = plain.slice(i, i + CHUNK);
    const dest = part[part.length - 1];
    const waypoints = part.slice(0, -1).map((p) => p.mapsText);
    const origin = i === 0 ? "" : plain[i - 1].mapsText;
    const params = new URLSearchParams({ api: "1", travelmode: "driving", destination: dest.mapsText });
    if (origin) params.set("origin", origin);
    if (waypoints.length) params.set("waypoints", waypoints.join("|"));
    links.push({ label: plain.length > CHUNK ? `Tramo ${i / CHUNK + 1}: paradas ${i + 1} a ${i + part.length}` : "Abrir la ruta en Google Maps", url: `https://www.google.com/maps/dir/?${params.toString()}` });
  }

  return NextResponse.json({
    start: startLabel,
    stops,
    totalKm: Math.round(stops.reduce((s, x) => s + x.legKm, 0) * 10) / 10,
    links,
  });
}
