import webpush from "web-push";
import { prisma } from "@/lib/prisma";
import { formatCLP } from "@/lib/money";
import { formatOrderNumber } from "@/lib/order-number";
import { sendTelegram, telegramEscape } from "@/lib/telegram";

// Notifications of new sales on the owner's phone (Web Push: they arrive with the phone's notification sound even when the
// panel is closed). The signing keys are generated once and kept in the database (AppSecret), never in the browser.
const SUBJECT = process.env.NEXT_PUBLIC_BASE_URL && process.env.NEXT_PUBLIC_BASE_URL.startsWith("https://") ? process.env.NEXT_PUBLIC_BASE_URL : "mailto:contacto@popebrand.cl";

async function vapid(): Promise<{ publicKey: string; privateKey: string }> {
  const rows = await prisma.appSecret.findMany({ where: { key: { in: ["vapid.public", "vapid.private"] } } });
  const pub = rows.find((r) => r.key === "vapid.public")?.value;
  const priv = rows.find((r) => r.key === "vapid.private")?.value;
  if (pub && priv) return { publicKey: pub, privateKey: priv };
  const keys = webpush.generateVAPIDKeys();
  // Two requests may race on the very first call: the first writer wins, both read back the same pair.
  await prisma.appSecret.upsert({ where: { key: "vapid.public" }, create: { key: "vapid.public", value: keys.publicKey }, update: {} });
  await prisma.appSecret.upsert({ where: { key: "vapid.private" }, create: { key: "vapid.private", value: keys.privateKey }, update: {} });
  const again = await prisma.appSecret.findMany({ where: { key: { in: ["vapid.public", "vapid.private"] } } });
  return {
    publicKey: again.find((r) => r.key === "vapid.public")?.value ?? keys.publicKey,
    privateKey: again.find((r) => r.key === "vapid.private")?.value ?? keys.privateKey,
  };
}

export async function getPushPublicKey(): Promise<string> {
  return (await vapid()).publicKey;
}

export type PushMessage = { title: string; body: string; url?: string; tag?: string };

export async function sendPushToAll(message: PushMessage): Promise<{ sent: number; removed: number }> {
  const subs = await prisma.pushSubscription.findMany();
  if (subs.length === 0) return { sent: 0, removed: 0 };
  const keys = await vapid();
  webpush.setVapidDetails(SUBJECT, keys.publicKey, keys.privateKey);
  const payload = JSON.stringify({ url: "/admin/pedidos", ...message });
  let sent = 0;
  let removed = 0;
  await Promise.all(
    subs.map(async (s) => {
      try {
        await webpush.sendNotification({ endpoint: s.endpoint, keys: { p256dh: s.p256dh, auth: s.auth } }, payload, { TTL: 60 * 60 * 12, urgency: "high" });
        sent++;
      } catch (e) {
        const code = (e as { statusCode?: number }).statusCode;
        // 404/410: that phone unsubscribed or the app was removed.
        if (code === 404 || code === 410) {
          await prisma.pushSubscription.delete({ where: { id: s.id } }).catch(() => undefined);
          removed++;
        } else console.error("[push] could not notify one device:", e instanceof Error ? e.message : e);
      }
    }),
  );
  return { sent, removed };
}

// "Nueva venta": called when an order becomes paid.
export async function notifyPaidOrder(orderId: string): Promise<void> {
  try {
    const order = await prisma.order.findUnique({ where: { id: orderId }, include: { items: { include: { product: { select: { name: true } } } } } });
    if (!order) return;
    const first = order.items[0];
    const what = first ? `${first.quantity}× ${first.product.name}${first.colorName ? ` (${first.colorName}, ${first.sizeLabel})` : ""}` : "Pedido";
    const more = order.items.length > 1 ? ` y ${order.items.length - 1} más` : "";
    const publicUrl = process.env.NEXT_PUBLIC_BASE_URL || "";
    const lines = order.items.map((it) => `${it.quantity}× ${telegramEscape(it.product.name)} — ${telegramEscape(it.colorName)} · Talla ${telegramEscape(it.sizeLabel)}`);
    const delivery = order.shippingMethod === "PICKUP" ? "Retiro en tienda" : `Envío a ${telegramEscape(order.shippingComuna || "—")}`;
    await Promise.all([
      sendPushToAll({
        title: `💸 Nueva venta ${formatOrderNumber(order)} · ${formatCLP(order.totalAmount)}`,
        body: `${order.customerName} · ${what}${more}`,
        url: "/admin/pedidos",
        tag: `order-${order.id}`,
      }).catch(() => undefined),
      sendTelegram(
        `💸 <b>Nueva venta ${formatOrderNumber(order)}</b> · ${formatCLP(order.totalAmount)}\n${delivery}\n${telegramEscape(order.customerName)}${order.customerPhone ? ` · ${telegramEscape(order.customerPhone)}` : ""}\n${lines.join("\n")}${publicUrl ? `\n${publicUrl}/admin/pedidos` : ""}`,
      ),
    ]);
  } catch (e) {
    console.error("[push] new-sale notification failed:", e instanceof Error ? e.message : e);
  }
}
