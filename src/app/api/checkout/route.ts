import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { createMercadoPagoPreference, isMercadoPagoConfigured } from "@/lib/mercadopago";

const placementSchema = z.object({
  designUrl: z.string(),
  xPct: z.number(),
  yPct: z.number(),
  widthPct: z.number(),
  rotationDeg: z.number(),
  // Optional: carts saved before this field existed won't have it.
  zoneWidthCm: z.number().optional().default(0),
  zoneHeightCm: z.number().optional().default(0),
});

const itemSchema = z.object({
  productId: z.string(),
  colorName: z.string(),
  sizeLabel: z.string(),
  // Optional/defaulted: carts created before the material field existed
  // (already sitting in a customer's browser at deploy time) won't have
  // this — fall back to the product's first material rather than hard-fail.
  materialLabel: z.string().optional().default(""),
  quantity: z.number().int().min(1),
  previewImageUrl: z.string(),
  designPlacement: z.record(z.string(), placementSchema),
});

const checkoutSchema = z
  .object({
    customerName: z.string().min(1),
    customerEmail: z.string().email(),
    customerPhone: z.string().default(""),
    shippingAddr: z.string().min(1),
    shippingMethod: z.enum(["PICKUP", "DELIVERY"]).default("DELIVERY"),
    shippingComuna: z.string().default(""),
    items: z.array(itemSchema).min(1),
  })
  .refine((data) => data.shippingMethod !== "DELIVERY" || data.shippingComuna.length > 0, {
    message: "Elige una comuna para el envío.",
    path: ["shippingComuna"],
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
    materialLabel: string;
    quantity: number;
    unitPrice: number;
    designPlacement: string;
    previewImageUrl: string;
  }[] = [];

  for (const item of data.items) {
    const product = await prisma.product.findUnique({
      where: { id: item.productId },
      include: { sizes: true, materials: true },
    });
    if (!product || !product.active) {
      return NextResponse.json({ error: "Un producto del carrito ya no está disponible." }, { status: 409 });
    }
    const size = product.sizes.find((s) => s.label === item.sizeLabel);
    if (!size) {
      return NextResponse.json({ error: "Talla inválida." }, { status: 409 });
    }
    const material = product.materials.find((m) => m.label === item.materialLabel) ?? product.materials[0];
    if (!material) {
      return NextResponse.json({ error: "Este producto no tiene materiales configurados." }, { status: 409 });
    }
    orderItemsData.push({
      productId: product.id,
      colorName: item.colorName,
      sizeLabel: item.sizeLabel,
      materialLabel: material.label,
      quantity: item.quantity,
      unitPrice: product.basePrice + size.priceDelta + material.priceDelta,
      designPlacement: JSON.stringify(item.designPlacement),
      previewImageUrl: item.previewImageUrl,
    });
  }

  // Shipping cost is always looked up server-side — never trust a
  // client-sent amount here either.
  let shippingCost = 0;
  if (data.shippingMethod === "DELIVERY") {
    const rate = await prisma.shippingComunaRate.findUnique({ where: { comuna: data.shippingComuna } });
    if (!rate) {
      return NextResponse.json({ error: "Esa comuna no tiene envío configurado." }, { status: 409 });
    }
    shippingCost = rate.priceCLP;
  } else {
    const settings = await prisma.storeSettings.findUnique({ where: { id: "singleton" } });
    if (!settings?.pickupEnabled) {
      return NextResponse.json({ error: "El retiro en tienda no está disponible." }, { status: 409 });
    }
  }

  const itemsTotal = orderItemsData.reduce((sum, i) => sum + i.unitPrice * i.quantity, 0);
  const totalAmount = itemsTotal + shippingCost;

  const order = await prisma.order.create({
    data: {
      customerName: data.customerName,
      customerEmail: data.customerEmail,
      customerPhone: data.customerPhone,
      shippingAddr: data.shippingAddr,
      shippingMethod: data.shippingMethod,
      shippingComuna: data.shippingComuna,
      shippingCost,
      totalAmount,
      items: { create: orderItemsData },
    },
  });

  if (!isMercadoPagoConfigured()) {
    return NextResponse.json({
      redirectUrl: `/checkout/modo-prueba?orderId=${order.id}`,
    });
  }

  try {
    const { initPoint } = await createMercadoPagoPreference({
      orderId: order.id,
      title: `Pedido Poleron Store #${order.id.slice(0, 8)}`,
      amountCLP: totalAmount,
      email: data.customerEmail,
    });

    return NextResponse.json({ redirectUrl: initPoint });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "No se pudo iniciar el pago." },
      { status: 502 },
    );
  }
}
