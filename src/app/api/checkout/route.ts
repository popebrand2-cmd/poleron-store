import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { createFlowPayment, isFlowConfigured } from "@/lib/flow";

const placementSchema = z.object({
  designUrl: z.string(),
  xPct: z.number(),
  yPct: z.number(),
  widthPct: z.number(),
  rotationDeg: z.number(),
});

const itemSchema = z.object({
  productId: z.string(),
  colorName: z.string(),
  sizeLabel: z.string(),
  quantity: z.number().int().min(1),
  previewImageUrl: z.string(),
  designPlacement: z.record(z.string(), placementSchema),
});

const checkoutSchema = z.object({
  customerName: z.string().min(1),
  customerEmail: z.string().email(),
  customerPhone: z.string().default(""),
  shippingAddr: z.string().min(1),
  items: z.array(itemSchema).min(1),
});

export async function POST(request: Request) {
  const json = await request.json();
  const parsed = checkoutSchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Datos inválidos." }, { status: 400 });
  }
  const data = parsed.data;

  // Recompute prices server-side from the DB — never trust client-sent amounts.
  const orderItemsData: {
    productId: string;
    colorName: string;
    sizeLabel: string;
    quantity: number;
    unitPrice: number;
    designPlacement: string;
    previewImageUrl: string;
  }[] = [];

  for (const item of data.items) {
    const product = await prisma.product.findUnique({
      where: { id: item.productId },
      include: { sizes: true },
    });
    if (!product || !product.active) {
      return NextResponse.json({ error: "Un producto del carrito ya no está disponible." }, { status: 409 });
    }
    const size = product.sizes.find((s) => s.label === item.sizeLabel);
    if (!size) {
      return NextResponse.json({ error: "Talla inválida." }, { status: 409 });
    }
    orderItemsData.push({
      productId: product.id,
      colorName: item.colorName,
      sizeLabel: item.sizeLabel,
      quantity: item.quantity,
      unitPrice: product.basePrice + size.priceDelta,
      designPlacement: JSON.stringify(item.designPlacement),
      previewImageUrl: item.previewImageUrl,
    });
  }

  const totalAmount = orderItemsData.reduce((sum, i) => sum + i.unitPrice * i.quantity, 0);

  const order = await prisma.order.create({
    data: {
      customerName: data.customerName,
      customerEmail: data.customerEmail,
      customerPhone: data.customerPhone,
      shippingAddr: data.shippingAddr,
      totalAmount,
      items: { create: orderItemsData },
    },
  });

  if (!isFlowConfigured()) {
    return NextResponse.json({
      redirectUrl: `/checkout/modo-prueba?orderId=${order.id}`,
    });
  }

  try {
    const payment = await createFlowPayment({
      commerceOrder: order.id,
      subject: `Pedido Poleron Store #${order.id.slice(0, 8)}`,
      amountCLP: totalAmount,
      email: data.customerEmail,
    });

    await prisma.order.update({
      where: { id: order.id },
      data: { flowToken: payment.token, flowOrder: payment.flowOrder },
    });

    return NextResponse.json({ redirectUrl: `${payment.url}?token=${payment.token}` });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "No se pudo iniciar el pago." },
      { status: 502 },
    );
  }
}
