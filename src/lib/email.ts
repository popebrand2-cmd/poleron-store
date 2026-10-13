import nodemailer from "nodemailer";
import { prisma } from "@/lib/prisma";

// Sends the store's e-mails to customers (order confirmation, in production, finished). The sending account is the owner's:
// either Resend (an API key; sends from her own domain once it is verified) or any SMTP account (Gmail with an app password,
// Zoho, Brevo…). It is set up in the admin panel (owner only) and kept in AppSecret, server-side; the environment variables
// RESEND_API_KEY / EMAIL_FROM or SMTP_HOST / SMTP_PORT / SMTP_USER / SMTP_PASS also work.
export type EmailConfig = {
  provider: "resend" | "smtp";
  fromName: string;
  fromEmail: string;
  replyTo: string;
  resendKey: string;
  smtpHost: string;
  smtpPort: number;
  smtpUser: string;
  smtpPass: string;
};

const EMPTY: EmailConfig = { provider: "resend", fromName: "POPE", fromEmail: "", replyTo: "", resendKey: "", smtpHost: "", smtpPort: 465, smtpUser: "", smtpPass: "" };

export async function getEmailConfig(): Promise<EmailConfig | null> {
  const row = await prisma.appSecret.findUnique({ where: { key: "email.config" } });
  if (row) {
    try {
      const c = { ...EMPTY, ...(JSON.parse(row.value) as Partial<EmailConfig>) };
      if (isComplete(c)) return c;
    } catch {
      // fall through to the environment
    }
  }
  const env = process.env;
  if (env.RESEND_API_KEY && env.EMAIL_FROM) return { ...EMPTY, provider: "resend", resendKey: env.RESEND_API_KEY, fromEmail: env.EMAIL_FROM };
  if (env.SMTP_HOST && env.SMTP_USER && env.SMTP_PASS) {
    return { ...EMPTY, provider: "smtp", smtpHost: env.SMTP_HOST, smtpPort: Number(env.SMTP_PORT) || 465, smtpUser: env.SMTP_USER, smtpPass: env.SMTP_PASS, fromEmail: env.EMAIL_FROM || env.SMTP_USER };
  }
  return null;
}

export function isComplete(c: EmailConfig): boolean {
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(c.fromEmail)) return false;
  return c.provider === "resend" ? Boolean(c.resendKey) : Boolean(c.smtpHost && c.smtpUser && c.smtpPass);
}

export async function saveEmailConfig(c: EmailConfig) {
  const value = JSON.stringify(c);
  await prisma.appSecret.upsert({ where: { key: "email.config" }, create: { key: "email.config", value }, update: { value } });
}

export async function sendEmail(opts: { to: string; subject: string; html: string; text: string }, config?: EmailConfig | null): Promise<{ ok: boolean; error?: string }> {
  const c = config ?? (await getEmailConfig());
  if (!c) return { ok: false, error: "El correo no está configurado." };
  const from = c.fromName ? `${c.fromName.replace(/["<>]/g, "")} <${c.fromEmail}>` : c.fromEmail;
  try {
    if (c.provider === "resend") {
      const res = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: { Authorization: `Bearer ${c.resendKey}`, "Content-Type": "application/json" },
        body: JSON.stringify({ from, to: [opts.to], subject: opts.subject, html: opts.html, text: opts.text, ...(c.replyTo ? { reply_to: c.replyTo } : {}) }),
        signal: AbortSignal.timeout(12000),
      });
      if (!res.ok) {
        const body = (await res.json().catch(() => ({}))) as { message?: string };
        throw new Error(body.message || `Resend respondió ${res.status}`);
      }
      return { ok: true };
    }
    const transport = nodemailer.createTransport({
      host: c.smtpHost,
      port: c.smtpPort,
      secure: c.smtpPort === 465,
      auth: { user: c.smtpUser, pass: c.smtpPass },
      connectionTimeout: 10000,
      socketTimeout: 15000,
    });
    await transport.sendMail({ from, to: opts.to, subject: opts.subject, html: opts.html, text: opts.text, ...(c.replyTo ? { replyTo: c.replyTo } : {}) });
    return { ok: true };
  } catch (e) {
    const error = e instanceof Error ? e.message : String(e);
    console.error("[email] could not send:", error);
    return { ok: false, error };
  }
}
