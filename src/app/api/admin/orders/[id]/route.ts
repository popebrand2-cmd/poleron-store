import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { ORDER_STATUSES } from "@/types";
import { releaseOrderFiles } from "@/lib/upload-cleanup";
import { sendOrderEmail } from "@/lib/order-emails";

// Change an order's status. Marking it SHIPPED means it is finished (sent or picked up): the
// customer's original image, the processed design and the mockup are deleted to free disk space.
export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const body = (await request.json().catch(() => ({}))) as { status?: string; trackingCode?: string };
  const status = ORDER_STATUSES.find((s) => s === body.status);
  if (!status) return NextResponse.json({ error: "Estado inválido." }, { status: 400 });
  const trackingCode = typeof body.trackingCode === "string" ? body.trackingCode.trim().slice(0, 80) : undefined;
  await prisma.order.update({ where: { id }, data: { status, ...(trackingCode !== undefined ? { trackingCode } : {}) } });
  // The customer's e-mail for this step (once each; nothing happens when e-mail is not configured).
  // (not awaited: a slow mail server must never hold the admin panel back)
  if (status === "PAID") void sendOrderEmail(id, "paid").catch(() => false);
  if (status === "IN_PRODUCTION") void sendOrderEmail(id, "production").catch(() => false);
  if (status === "SHIPPED") void sendOrderEmail(id, "shipped").catch(() => false);
  let deleted = 0;
  if (status === "SHIPPED" || status === "CANCELLED") deleted = (await releaseOrderFiles(id)).deleted;
  return NextResponse.json({ ok: true, deletedFiles: deleted });
}

export async function DELETE(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  await releaseOrderFiles(id).catch(() => undefined);
  await prisma.order.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
