import { prisma } from "@/lib/prisma";
import { isMercadoPagoConfigured, listMercadoPagoPaymentsForOrder } from "@/lib/mercadopago";
import { notifyPaidOrder } from "@/lib/push";

// Asks Mercado Pago whether an order has an approved payment and, if so, marks it PAID. Returns the order's status afterwards.
// Safe to call as often as needed: an order that is already paid (or further along) is never touched, and an order is never
// cancelled from here (a payment that is only "pending" or was rejected once can still be paid later).
export async function reconcileOrderPayment(orderId: string): Promise<string | null> {
  const order = await prisma.order.findUnique({ where: { id: orderId }, select: { id: true, status: true } });
  if (!order) return null;
  if (order.status !== "PENDING_PAYMENT" && order.status !== "CANCELLED") return order.status;
  if (!isMercadoPagoConfigured()) return order.status;
  try {
    const payments = await listMercadoPagoPaymentsForOrder(orderId);
    if (payments.some((p) => p.status === "approved")) {
      await prisma.order.update({ where: { id: orderId }, data: { status: "PAID" } });
      console.log(`[payments] order ${orderId} marked PAID`);
      // The owner's phone: "Nueva venta". Only on the change to paid (an order already paid returns above).
      await notifyPaidOrder(orderId);
      return "PAID";
    }
  } catch (e) {
    console.error(`[payments] could not check order ${orderId}:`, e instanceof Error ? e.message : e);
  }
  return order.status;
}

// Checks every order still waiting for payment from the last two weeks (the store owner opens Pedidos, or a customer returns
// from the payment page). Bounded, so it can never hold a page back for long.
export async function reconcilePendingOrders(limit = 15): Promise<number> {
  if (!isMercadoPagoConfigured()) return 0;
  const since = new Date(Date.now() - 14 * 24 * 60 * 60 * 1000);
  const pending = await prisma.order.findMany({
    where: { status: "PENDING_PAYMENT", createdAt: { gte: since } },
    orderBy: { createdAt: "desc" },
    take: limit,
    select: { id: true },
  });
  let fixed = 0;
  await Promise.all(
    pending.map(async (o) => {
      if ((await reconcileOrderPayment(o.id)) === "PAID") fixed++;
    }),
  );
  return fixed;
}
