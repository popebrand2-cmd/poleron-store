import { NextResponse } from "next/server";
import { getMerchantOrderReference, getMercadoPagoPayment } from "@/lib/mercadopago";
import { reconcileOrderPayment } from "@/lib/order-payment";

// Mercado Pago calls this server-to-server whenever a payment or an order changes. Depending on the account it sends a
// "payment" notification (data.id = payment id) or a "merchant_order" one, in the JSON body (Webhooks) or the query string
// (IPN). Whatever arrives, we end up asking Mercado Pago for the real state of OUR order and trust only that answer.
export async function POST(request: Request) {
  const url = new URL(request.url);
  let id = url.searchParams.get("data.id") || url.searchParams.get("id");
  let topic = url.searchParams.get("type") || url.searchParams.get("topic") || "";

  try {
    const body = await request.json();
    id = id ?? (body?.data?.id != null ? String(body.data.id) : null);
    topic = topic || String(body?.type ?? body?.topic ?? "");
  } catch {
    // no JSON body — the query string had what there is
  }

  if (!id) return NextResponse.json({ ok: true });

  try {
    let orderId: string | null = null;
    if (topic === "merchant_order") orderId = await getMerchantOrderReference(id);
    else orderId = (await getMercadoPagoPayment(id)).orderId;
    if (orderId) await reconcileOrderPayment(orderId);
    else console.error(`[mercadopago webhook] ${topic || "notification"} ${id} has no order reference`);
  } catch (e) {
    // Never answer with an error (Mercado Pago would keep retrying); the order is also re-checked when the owner opens
    // Pedidos and when the customer comes back from the payment page.
    console.error(`[mercadopago webhook] ${topic || "notification"} ${id}:`, e instanceof Error ? e.message : e);
  }

  return NextResponse.json({ ok: true });
}

// Some setups verify the URL with a GET.
export async function GET() {
  return NextResponse.json({ ok: true });
}
