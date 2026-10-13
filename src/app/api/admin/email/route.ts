import { NextResponse } from "next/server";
import { z } from "zod";
import { getAdminAccess } from "@/lib/admin-session";
import { getEmailConfig, isComplete, saveEmailConfig, sendEmail, type EmailConfig } from "@/lib/email";

async function ownerOnly() {
  return (await getAdminAccess())?.kind === "owner";
}

const configSchema = z.object({
  provider: z.enum(["resend", "smtp"]),
  fromName: z.string().trim().max(60),
  fromEmail: z.string().trim().email("El correo de envío no es válido."),
  replyTo: z.string().trim().max(120).default(""),
  resendKey: z.string().trim().max(200).default(""),
  smtpHost: z.string().trim().max(120).default(""),
  smtpPort: z.coerce.number().int().min(1).max(65535).default(465),
  smtpUser: z.string().trim().max(160).default(""),
  smtpPass: z.string().max(200).default(""),
});

export async function GET() {
  if (!(await ownerOnly())) return NextResponse.json({ error: "Solo la dueña puede configurar esto." }, { status: 403 });
  const c = await getEmailConfig();
  return NextResponse.json({
    configured: Boolean(c),
    provider: c?.provider ?? "resend",
    fromName: c?.fromName ?? "POPE",
    fromEmail: c?.fromEmail ?? "",
    replyTo: c?.replyTo ?? "",
    smtpHost: c?.smtpHost ?? "",
    smtpPort: c?.smtpPort ?? 465,
    smtpUser: c?.smtpUser ?? "",
    // The secrets are never sent back: only whether they are saved.
    hasResendKey: Boolean(c?.resendKey),
    hasSmtpPass: Boolean(c?.smtpPass),
  });
}

export async function POST(request: Request) {
  if (!(await ownerOnly())) return NextResponse.json({ error: "Solo la dueña puede configurar esto." }, { status: 403 });
  const body = (await request.json().catch(() => ({}))) as { action?: string; config?: unknown; to?: string };

  if (body.action === "save") {
    const parsed = configSchema.safeParse(body.config);
    if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Datos inválidos." }, { status: 400 });
    const previous = await getEmailConfig();
    const next: EmailConfig = { ...parsed.data };
    // A secret left empty keeps the saved one.
    if (!next.resendKey && previous?.resendKey) next.resendKey = previous.resendKey;
    if (!next.smtpPass && previous?.smtpPass) next.smtpPass = previous.smtpPass;
    if (!isComplete(next)) {
      return NextResponse.json({ error: next.provider === "resend" ? "Falta la clave (API key) de Resend." : "Faltan el servidor, el usuario o la contraseña." }, { status: 400 });
    }
    await saveEmailConfig(next);
    return NextResponse.json({ ok: true });
  }

  if (body.action === "test") {
    const to = (body.to ?? "").trim();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(to)) return NextResponse.json({ error: "Escribe el correo al que quieres mandar la prueba." }, { status: 400 });
    const result = await sendEmail({
      to,
      subject: "Prueba de correos de POPE",
      html: "<p>Si lees esto, los correos de tu tienda funcionan. Tus clientes recibirán su confirmación así.</p>",
      text: "Si lees esto, los correos de tu tienda funcionan. Tus clientes recibirán su confirmación así.",
    });
    if (!result.ok) return NextResponse.json({ error: `No se pudo enviar: ${result.error ?? "error desconocido"}` }, { status: 400 });
    return NextResponse.json({ ok: true });
  }

  return NextResponse.json({ error: "Acción inválida." }, { status: 400 });
}
