import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getPushPublicKey, sendPushToAll } from "@/lib/push";

// Public key the browser needs to subscribe, and how many devices are registered.
export async function GET() {
  return NextResponse.json({ publicKey: await getPushPublicKey(), devices: await prisma.pushSubscription.count() });
}

const subscribeSchema = z.object({
  endpoint: z.string().url(),
  keys: z.object({ p256dh: z.string().min(1), auth: z.string().min(1) }),
});

// Registers this phone/computer.
export async function POST(request: Request) {
  const parsed = subscribeSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Datos inválidos." }, { status: 400 });
  const { endpoint, keys } = parsed.data;
  const userAgent = (request.headers.get("user-agent") ?? "").slice(0, 200);
  await prisma.pushSubscription.upsert({
    where: { endpoint },
    create: { endpoint, p256dh: keys.p256dh, auth: keys.auth, userAgent },
    update: { p256dh: keys.p256dh, auth: keys.auth, userAgent },
  });
  return NextResponse.json({ ok: true });
}

// Test message ("Enviar prueba") or removal of this device.
export async function PUT(request: Request) {
  const body = (await request.json().catch(() => ({}))) as { action?: string; endpoint?: string };
  if (body.action === "unsubscribe" && body.endpoint) {
    await prisma.pushSubscription.deleteMany({ where: { endpoint: body.endpoint } });
    return NextResponse.json({ ok: true });
  }
  const result = await sendPushToAll({ title: "🔔 Avisos de POPE activados", body: "Así te va a llegar cada venta nueva.", tag: "test" });
  return NextResponse.json(result);
}
