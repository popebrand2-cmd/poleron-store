import { NextResponse } from "next/server";
import { isMercadoPagoConfigured } from "@/lib/mercadopago";
import { reconcileOrderPayment } from "@/lib/order-payment";

// "Verificar pago": asks Mercado Pago directly whether this order has an approved payment and updates it.
export async function POST(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!isMercadoPagoConfigured()) return NextResponse.json({ error: "Mercado Pago no está configurado en el servidor." }, { status: 400 });
  const status = await reconcileOrderPayment(id);
  if (!status) return NextResponse.json({ error: "No existe ese pedido." }, { status: 404 });
  return NextResponse.json({ status });
}
