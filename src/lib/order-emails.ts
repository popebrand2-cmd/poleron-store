import { prisma } from "@/lib/prisma";
import { formatCLP } from "@/lib/money";
import { formatOrderNumber } from "@/lib/order-number";
import { getEmailConfig, sendEmail } from "@/lib/email";

export type OrderEmailEvent = "paid" | "production" | "shipped";

const esc = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

// The e-mails a customer gets about their order. Each one is sent once (the events already sent are kept in Order.emailsSent).
export async function sendOrderEmail(orderId: string, event: OrderEmailEvent): Promise<boolean> {
  try {
    const order = await prisma.order.findUnique({ where: { id: orderId }, include: { items: { include: { product: { select: { name: true } } } } } });
    if (!order || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(order.customerEmail)) return false;
    if (order.emailsSent.split(",").includes(event)) return false;
    const config = await getEmailConfig();
    if (!config) return false;

    const [settings, texts] = await Promise.all([
      prisma.storeSettings.findUnique({ where: { id: "singleton" } }),
      prisma.siteText.findMany({ where: { key: { in: ["setting.whatsappNumber", "setting.instagramUrl"] } } }),
    ]);
    const text = (k: string) => texts.find((t) => t.key === k)?.value ?? "";
    const wa = text("setting.whatsappNumber").replace(/\D/g, "");
    const number = formatOrderNumber(order);
    const first = order.customerName.trim().split(/\s+/)[0] || "";
    const pickup = order.shippingMethod === "PICKUP";
    const delivery = pickup
      ? `Retiro en tienda${settings?.pickupAddress ? `: ${settings.pickupAddress}` : ""}${settings?.pickupHours ? ` (${settings.pickupHours})` : ""}`
      : `Envío a ${order.shippingComuna || "tu dirección"}${order.shippingAddr ? ` — ${order.shippingAddr}` : ""}`;

    let subject = "";
    let headline = "";
    let intro = "";
    let next = "";
    if (event === "paid") {
      subject = `Recibimos tu pedido ${number}`;
      headline = "¡Gracias por tu compra!";
      intro = "Tu pago fue confirmado y tu pedido ya está registrado.";
      next = "Ahora lo preparamos. Te escribiremos a este correo cuando esté en producción y cuando esté listo.";
    } else if (event === "production") {
      subject = `Tu pedido ${number} está en producción`;
      headline = "Estamos haciendo tu pedido";
      intro = "Tu pedido ya está en producción.";
      next = "Te avisaremos por correo apenas esté listo.";
    } else {
      subject = pickup ? `Tu pedido ${number} está listo para retirar` : `Tu pedido ${number} está listo`;
      headline = pickup ? "Tu pedido está listo para retirar" : "Tu pedido está listo y va en camino";
      intro = pickup ? "Ya puedes pasar a retirarlo." : "Tu pedido ya salió de nuestro taller.";
      next = !pickup && order.trackingCode ? `Código de seguimiento: ${order.trackingCode}` : "";
    }

    const lines = order.items.map((it) => ({
      name: `${it.quantity}× ${it.product.name}`,
      detail: [it.colorName, it.sizeLabel ? `Talla ${it.sizeLabel}` : "", it.materialLabel].filter(Boolean).join(" · "),
      price: formatCLP(it.unitPrice * it.quantity),
    }));

    const contactLines = [wa ? `WhatsApp: +${wa}` : "", text("setting.instagramUrl") ? `Instagram: ${text("setting.instagramUrl")}` : ""].filter(Boolean);

    const html = `<!doctype html><html lang="es"><body style="margin:0;background:#0b0b0b;font-family:Arial,Helvetica,sans-serif;color:#111">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#0b0b0b;padding:24px 12px"><tr><td align="center">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;background:#ffffff;border-radius:16px;overflow:hidden">
<tr><td style="background:#000;padding:22px 28px;border-bottom:4px solid #b6ff00"><span style="font-size:28px;font-weight:800;letter-spacing:2px;color:#b6ff00">POPE</span></td></tr>
<tr><td style="padding:28px">
<h1 style="margin:0 0 6px;font-size:24px;line-height:1.2">${esc(headline)}</h1>
<p style="margin:0 0 18px;color:#444;font-size:15px;line-height:1.5">${first ? `Hola ${esc(first)}. ` : ""}${esc(intro)}</p>
<p style="margin:0 0 6px;font-size:13px;color:#777;text-transform:uppercase;letter-spacing:1px">Pedido</p>
<p style="margin:0 0 18px;font-size:20px;font-weight:700">${esc(number)}</p>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border-top:1px solid #e5e5e5">
${lines
  .map(
    (l) => `<tr><td style="padding:12px 0;border-bottom:1px solid #e5e5e5;font-size:15px"><strong>${esc(l.name)}</strong>${l.detail ? `<br><span style="color:#666;font-size:13px">${esc(l.detail)}</span>` : ""}</td><td align="right" style="padding:12px 0;border-bottom:1px solid #e5e5e5;font-size:15px;white-space:nowrap">${esc(l.price)}</td></tr>`,
  )
  .join("\n")}
${order.shippingCost > 0 ? `<tr><td style="padding:12px 0;border-bottom:1px solid #e5e5e5;font-size:14px;color:#555">Envío</td><td align="right" style="padding:12px 0;border-bottom:1px solid #e5e5e5;font-size:14px;color:#555">${esc(formatCLP(order.shippingCost))}</td></tr>` : ""}
<tr><td style="padding:14px 0;font-size:16px"><strong>Total</strong></td><td align="right" style="padding:14px 0;font-size:16px"><strong>${esc(formatCLP(order.totalAmount))}</strong></td></tr>
</table>
<p style="margin:14px 0 0;font-size:14px;color:#333"><strong>Entrega:</strong> ${esc(delivery)}</p>
${next ? `<p style="margin:18px 0 0;padding:14px 16px;background:#f4ffd1;border-radius:10px;font-size:15px;color:#222">${esc(next)}</p>` : ""}
${contactLines.length ? `<p style="margin:22px 0 0;font-size:13px;color:#666">¿Dudas? Escríbenos.<br>${contactLines.map(esc).join("<br>")}</p>` : ""}
</td></tr></table>
<p style="margin:14px 0 0;font-size:12px;color:#888">popebrand.cl</p>
</td></tr></table></body></html>`;

    const textBody = [
      headline,
      "",
      `${first ? `Hola ${first}. ` : ""}${intro}`,
      "",
      `Pedido ${number}`,
      ...lines.map((l) => `- ${l.name}${l.detail ? ` (${l.detail})` : ""}: ${l.price}`),
      order.shippingCost > 0 ? `Envío: ${formatCLP(order.shippingCost)}` : "",
      `Total: ${formatCLP(order.totalAmount)}`,
      `Entrega: ${delivery}`,
      "",
      next,
      "",
      ...contactLines,
    ]
      .filter((l, i, a) => l !== "" || a[i - 1] !== "")
      .join("\n");

    const result = await sendEmail({ to: order.customerEmail, subject, html, text: textBody }, config);
    if (!result.ok) return false;
    const done = order.emailsSent ? `${order.emailsSent},${event}` : event;
    await prisma.order.update({ where: { id: order.id }, data: { emailsSent: done } });
    return true;
  } catch (e) {
    console.error("[order-emails] failed:", e instanceof Error ? e.message : e);
    return false;
  }
}
