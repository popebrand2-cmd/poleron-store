import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { formatOrderNumber } from "@/lib/order-number";
import { getAdminAccess } from "@/lib/admin-session";
import { REAL_SALE_STATUSES, chileDay, chileHourAndWeekday, resolveRange } from "@/lib/sales-report";

export const dynamic = "force-dynamic";

const STATUS_LABELS: Record<string, string> = {
  PENDING_PAYMENT: "Pendiente de pago",
  PAID: "Pagado",
  IN_PRODUCTION: "En producción",
  SHIPPED: "Terminado",
  CANCELLED: "Cancelado",
};

// One row per garment sold in the chosen period (same filter as Admin > Ventas), ready for Excel:
// ";" as separator and a BOM so accents and the Chilean number format open right.
export async function GET(req: NextRequest) {
  const access = await getAdminAccess();
  if (!access || !access.perms.includes("ventas")) return new Response("No autorizado.", { status: 401 });

  const sp = req.nextUrl.searchParams;
  const first = await prisma.order.findFirst({ orderBy: { createdAt: "asc" }, select: { createdAt: true } });
  const range = resolveRange(
    { periodo: sp.get("periodo") ?? undefined, desde: sp.get("desde") ?? undefined, hasta: sp.get("hasta") ?? undefined },
    first?.createdAt ?? null,
  );
  const all = sp.get("todos") === "1"; // include pending/cancelled too

  const orders = await prisma.order.findMany({
    where: { createdAt: { gte: range.start, lt: range.end }, ...(all ? {} : { status: { in: REAL_SALE_STATUSES } }) },
    orderBy: { createdAt: "asc" },
    include: { items: { include: { product: { select: { name: true } } } } },
  });

  const header = [
    "Pedido",
    "Fecha",
    "Hora",
    "Estado",
    "Cliente",
    "Email",
    "Teléfono",
    "Entrega",
    "Comuna",
    "Producto",
    "Color",
    "Talla",
    "Técnica",
    "Cantidad",
    "Precio unitario",
    "Subtotal",
    "Envío del pedido",
    "Total del pedido",
  ];
  const rows: (string | number)[][] = [header];
  for (const o of orders) {
    const { hour } = chileHourAndWeekday(o.createdAt);
    o.items.forEach((it, idx) => {
      rows.push([
        formatOrderNumber(o),
        chileDay(o.createdAt),
        `${String(hour).padStart(2, "0")}:00`,
        STATUS_LABELS[o.status] ?? o.status,
        o.customerName,
        o.customerEmail,
        o.customerPhone,
        o.shippingMethod === "PICKUP" ? "Retiro" : "Envío",
        o.shippingComuna,
        it.product.name,
        it.colorName,
        it.sizeLabel,
        it.materialLabel,
        it.quantity,
        it.unitPrice,
        it.unitPrice * it.quantity,
        // Order-level amounts only on the first line, so summing the column in Excel doesn't double count.
        idx === 0 ? o.shippingCost : "",
        idx === 0 ? o.totalAmount : "",
      ]);
    });
  }

  const csv = "﻿" + rows.map((r) => r.map(cell).join(";")).join("\r\n");
  const name = `ventas-pope_${range.fromDay}_al_${range.toDay}.csv`;
  return new Response(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${name}"`,
      "Cache-Control": "no-store",
    },
  });
}

function cell(v: string | number): string {
  if (typeof v === "number") return String(v);
  // Neutralize spreadsheet formulas typed into customer fields (=, +, -, @ at the start).
  const safe = /^[=@]/.test(v) || /^[+\-](?![\d\s])/.test(v) ? `'${v}` : v;
  return /[";\r\n]/.test(safe) ? `"${safe.replace(/"/g, '""')}"` : safe;
}
