import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { FLOW_STATUS_PAID, getFlowPaymentStatus } from "@/lib/flow";

// Flow redirects the customer's browser here (via an auto-submitted POST
// form) after they finish paying. We double-check status here too, in case
// the server-to-server /api/flow/confirm webhook hasn't landed yet.
export async function POST(request: Request) {
  const form = await request.formData();
  const token = form.get("token");
  const base = process.env.NEXT_PUBLIC_BASE_URL ?? "http://localhost:3000";

  if (typeof token !== "string") {
    return NextResponse.redirect(`${base}/checkout/pendiente`, 303);
  }

  try {
    const { status, commerceOrder } = await getFlowPaymentStatus(token);
    const paid = status === FLOW_STATUS_PAID;
    await prisma.order.update({
      where: { id: commerceOrder },
      data: { status: paid ? "PAID" : "CANCELLED" },
    });
    return NextResponse.redirect(
      `${base}/checkout/${paid ? "exito" : "pendiente"}?orderId=${commerceOrder}`,
      303,
    );
  } catch {
    return NextResponse.redirect(`${base}/checkout/pendiente`, 303);
  }
}
