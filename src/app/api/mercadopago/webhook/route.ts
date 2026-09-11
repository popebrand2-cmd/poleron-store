import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getMercadoPagoPayment } from "@/lib/mercadopago";

// Mercado Pago calls this server-to-server whenever a payment's status
// changes. It sends the payment id either in the JSON body (current
// "Webhooks" format) or as query params (older IPN format) — we check both.
export async function POST(request: Request) {
  const url = new URL(request.url);
  let paymentId = url.searchParams.get("data.id") || url.searchParams.get("id");

  if (!paymentId) {
    try {
      const body = await request.json();
      paymentId = body?.data?.id ?? null;
    } catch {
      // no JSON body — fall through with whatever the query string had
    }
  }

  if (!paymentId) {
    return NextResponse.json({ ok: true }); // nothing to do, acknowledge anyway
  }

  try {
    const { approved, orderId } = await getMercadoPagoPayment(paymentId);
    if (orderId) {
      await prisma.order.update({
        where: { id: orderId },
        data: { status: approved ? "PAID" : "CANCELLED" },
      });
    }
  } catch {
    // Swallow errors — Mercado Pago retries webhooks, and a 500 here would
    // just trigger repeated retries for a payment we may not be able to look up.
  }

  return NextResponse.json({ ok: true });
}
