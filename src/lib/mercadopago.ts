import { MercadoPagoConfig, MerchantOrder, Payment, Preference } from "mercadopago";

export function isMercadoPagoConfigured(): boolean {
  return Boolean(process.env.MERCADOPAGO_ACCESS_TOKEN);
}

function client(): MercadoPagoConfig {
  return new MercadoPagoConfig({ accessToken: process.env.MERCADOPAGO_ACCESS_TOKEN ?? "" });
}

// The public address of the store for the links Mercado Pago uses (where the customer returns after paying, and where it
// sends the payment notification). It is the address the customer is actually using right now (the request's host); the
// NEXT_PUBLIC_BASE_URL variable is only the fallback. Using the request avoids a stale variable (an old railway.app address)
// sending customers to a page that no longer exists and the notifications into the void.
export function publicBaseUrl(request?: Request): string {
  const env = (process.env.NEXT_PUBLIC_BASE_URL ?? "").replace(/\/+$/, "");
  const host = request?.headers.get("x-forwarded-host") ?? request?.headers.get("host") ?? "";
  const hostName = host.split(":")[0];
  const local = !hostName || hostName === "localhost" || hostName.startsWith("127.") || hostName.endsWith(".localhost");
  if (!local && !hostName.endsWith(".up.railway.app")) {
    const proto = request?.headers.get("x-forwarded-proto")?.split(",")[0] ?? "https";
    return `${proto}://${host.split(",")[0].trim()}`;
  }
  return env || "http://localhost:3000";
}

export async function createMercadoPagoPreference(opts: {
  orderId: string;
  title: string;
  amountCLP: number;
  email: string;
  baseUrl?: string;
}): Promise<{ initPoint: string }> {
  const publicUrl = opts.baseUrl || process.env.NEXT_PUBLIC_BASE_URL || "http://localhost:3000";
  const preference = new Preference(client());

  const result = await preference.create({
    body: {
      items: [
        {
          id: opts.orderId,
          title: opts.title,
          quantity: 1,
          unit_price: opts.amountCLP,
          currency_id: "CLP",
        },
      ],
      payer: { email: opts.email },
      external_reference: opts.orderId,
      back_urls: {
        success: `${publicUrl}/checkout/exito`,
        pending: `${publicUrl}/checkout/pendiente`,
        failure: `${publicUrl}/checkout/pendiente`,
      },
      auto_return: "approved",
      notification_url: `${publicUrl}/api/mercadopago/webhook`,
    },
  });

  const initPoint = result.init_point ?? result.sandbox_init_point;
  if (!initPoint) throw new Error("Mercado Pago no devolvió un link de pago.");

  return { initPoint };
}

// Looks up a payment by id and reports whether it was approved, plus the
// orderId we stashed in external_reference when creating the preference.
export async function getMercadoPagoPayment(
  paymentId: string,
): Promise<{ approved: boolean; orderId: string | null }> {
  const payment = new Payment(client());
  const result = await payment.get({ id: paymentId });
  return {
    approved: result.status === "approved",
    orderId: result.external_reference ?? null,
  };
}

// Every payment Mercado Pago has for one of our orders (we put the order id in external_reference when creating the
// preference), newest first. Used to confirm an order is really paid without depending on the webhook arriving.
export async function listMercadoPagoPaymentsForOrder(orderId: string): Promise<{ id: string; status: string }[]> {
  const payment = new Payment(client());
  const result = await payment.search({ options: { external_reference: orderId, sort: "date_created", criteria: "desc" } });
  return (result.results ?? []).map((p) => ({ id: String(p.id), status: String(p.status ?? "") }));
}

// A "merchant_order" notification carries the order, not the payment: returns our order id from it.
export async function getMerchantOrderReference(merchantOrderId: string): Promise<string | null> {
  const mo = new MerchantOrder(client());
  const result = await mo.get({ merchantOrderId });
  return result.external_reference ?? null;
}
