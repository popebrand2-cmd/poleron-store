import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { FLOW_STATUS_PAID, getFlowPaymentStatus } from "@/lib/flow";

// Flow calls this server-to-server once payment is resolved. Must respond
// with plain "OK" (200) or Flow will keep retrying.
export async function POST(request: Request) {
  const form = await request.formData();
  const token = form.get("token");

  if (typeof token !== "string") {
    return new NextResponse("Missing token", { status: 400 });
  }

  try {
    const { status, commerceOrder } = await getFlowPaymentStatus(token);
    await prisma.order.update({
      where: { id: commerceOrder },
      data: { status: status === FLOW_STATUS_PAID ? "PAID" : "CANCELLED" },
    });
  } catch {
    return new NextResponse("Error", { status: 500 });
  }

  return new NextResponse("OK", { status: 200 });
}
