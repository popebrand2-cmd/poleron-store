import crypto from "crypto";

function signParams(params: Record<string, string>): string {
  const secret = process.env.FLOW_SECRET_KEY ?? "";
  const sortedKeys = Object.keys(params).sort();
  const toSign = sortedKeys.map((k) => `${k}${params[k]}`).join("");
  return crypto.createHmac("sha256", secret).update(toSign).digest("hex");
}

export function isFlowConfigured(): boolean {
  return Boolean(process.env.FLOW_API_KEY && process.env.FLOW_SECRET_KEY);
}

export async function createFlowPayment(opts: {
  commerceOrder: string;
  subject: string;
  amountCLP: number;
  email: string;
}): Promise<{ url: string; token: string; flowOrder: string }> {
  const apiKey = process.env.FLOW_API_KEY ?? "";
  const baseUrl = process.env.FLOW_API_URL ?? "https://sandbox.flow.cl/api";
  const publicUrl = process.env.NEXT_PUBLIC_BASE_URL ?? "http://localhost:3000";

  const params: Record<string, string> = {
    apiKey,
    commerceOrder: opts.commerceOrder,
    subject: opts.subject,
    currency: "CLP",
    amount: String(Math.round(opts.amountCLP)),
    email: opts.email,
    urlConfirmation: `${publicUrl}/api/flow/confirm`,
    urlReturn: `${publicUrl}/api/flow/retorno`,
    paymentMethod: "9",
  };
  const s = signParams(params);

  const body = new URLSearchParams({ ...params, s });
  const res = await fetch(`${baseUrl}/payment/create`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body,
  });

  const data = await res.json();
  if (!res.ok) {
    throw new Error(data.message ?? "No se pudo crear el pago en Flow.");
  }

  return { url: data.url, token: data.token, flowOrder: String(data.flowOrder ?? "") };
}

export async function getFlowPaymentStatus(token: string): Promise<{ status: number; commerceOrder: string }> {
  const apiKey = process.env.FLOW_API_KEY ?? "";
  const baseUrl = process.env.FLOW_API_URL ?? "https://sandbox.flow.cl/api";

  const params: Record<string, string> = { apiKey, token };
  const s = signParams(params);

  const query = new URLSearchParams({ ...params, s });
  const res = await fetch(`${baseUrl}/payment/getStatus?${query.toString()}`);
  const data = await res.json();
  if (!res.ok) {
    throw new Error(data.message ?? "No se pudo consultar el estado del pago en Flow.");
  }
  return { status: data.status, commerceOrder: data.commerceOrder };
}

// Flow status codes: 1 pending, 2 paid, 3 rejected, 4 cancelled.
export const FLOW_STATUS_PAID = 2;
