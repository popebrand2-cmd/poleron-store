import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { CHILE_COMUNAS } from "@/lib/chile-comunas";

const VALID_COMUNAS = new Set(CHILE_COMUNAS.map((c) => c.comuna));

const rateSchema = z.object({
  comuna: z.string().refine((c) => VALID_COMUNAS.has(c), "Comuna inválida."),
  priceCLP: z.number().int().min(0),
});

const settingsSchema = z.object({
  pickupEnabled: z.boolean(),
  pickupAddress: z.string(),
  pickupHours: z.string(),
});

const putSchema = z.object({
  rates: z.array(rateSchema),
  storeSettings: settingsSchema,
});

export async function GET() {
  const [rates, storeSettings] = await Promise.all([
    prisma.shippingComunaRate.findMany(),
    prisma.storeSettings.findUnique({ where: { id: "singleton" } }),
  ]);

  return NextResponse.json({
    rates: rates.map((r) => ({ comuna: r.comuna, priceCLP: r.priceCLP })),
    storeSettings: storeSettings ?? { pickupEnabled: true, pickupAddress: "", pickupHours: "" },
  });
}

export async function PUT(request: Request) {
  const json = await request.json();
  const parsed = putSchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Datos inválidos." }, { status: 400 });
  }
  const data = parsed.data;

  await prisma.$transaction([
    ...data.rates.map((r) =>
      prisma.shippingComunaRate.upsert({
        where: { comuna: r.comuna },
        create: {
          comuna: r.comuna,
          priceCLP: r.priceCLP,
          region: CHILE_COMUNAS.find((c) => c.comuna === r.comuna)?.region ?? "",
        },
        update: { priceCLP: r.priceCLP },
      }),
    ),
    prisma.storeSettings.upsert({
      where: { id: "singleton" },
      create: { id: "singleton", ...data.storeSettings },
      update: data.storeSettings,
    }),
  ]);

  return NextResponse.json({ ok: true });
}
