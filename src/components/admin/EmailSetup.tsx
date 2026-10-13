"use client";

import { useEffect, useState } from "react";

type Status = {
  configured: boolean;
  provider: "resend" | "smtp";
  fromName: string;
  fromEmail: string;
  replyTo: string;
  smtpHost: string;
  smtpPort: number;
  smtpUser: string;
  hasResendKey: boolean;
  hasSmtpPass: boolean;
};

const field = "w-full rounded-lg border border-neutral-700 bg-neutral-900 px-3 py-2 text-xs text-white focus:border-neon focus:outline-none";

// Owner-only: the account the store sends its customer e-mails from (order confirmation, in production, finished).
export default function EmailSetup() {
  const [status, setStatus] = useState<Status | null>(null);
  const [forbidden, setForbidden] = useState(false);
  const [f, setF] = useState({ provider: "resend" as "resend" | "smtp", fromName: "POPE", fromEmail: "", replyTo: "", resendKey: "", smtpHost: "", smtpPort: "465", smtpUser: "", smtpPass: "" });
  const [testTo, setTestTo] = useState("");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [open, setOpen] = useState(false);

  async function load() {
    const res = await fetch("/api/admin/email");
    if (res.status === 403) {
      setForbidden(true);
      return;
    }
    if (!res.ok) return;
    const s = (await res.json()) as Status;
    setStatus(s);
    setF((p) => ({ ...p, provider: s.provider, fromName: s.fromName, fromEmail: s.fromEmail, replyTo: s.replyTo, smtpHost: s.smtpHost, smtpPort: String(s.smtpPort), smtpUser: s.smtpUser }));
  }
  useEffect(() => {
    load();
  }, []);

  async function call(body: Record<string, unknown>, ok: string) {
    setBusy(true);
    setMessage("");
    try {
      const res = await fetch("/api/admin/email", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
      const data = (await res.json()) as { error?: string };
      if (!res.ok) throw new Error(data.error ?? "No se pudo completar.");
      setMessage(ok);
      await load();
    } catch (e) {
      setMessage(e instanceof Error ? e.message : "No se pudo completar.");
    } finally {
      setBusy(false);
    }
  }

  if (forbidden || !status) return null;
  const btn = "rounded-full bg-neon px-4 py-2 text-xs font-bold uppercase text-black disabled:opacity-50";

  return (
    <div className="space-y-2 border-t border-white/10 pt-3">
      <p className="text-xs font-bold uppercase tracking-wide text-neon">Correos a tus clientes</p>
      <p>
        {status.configured ? (
          <>
            <strong className="text-emerald-400">Activo.</strong> Cada cliente recibe un correo al pagar, otro cuando su pedido entra a producción y otro cuando está
            listo (con su código de seguimiento si lo escribes).
          </>
        ) : (
          <>
            <strong className="text-amber-400">Sin configurar:</strong> hoy los clientes no reciben ningún correo. Conecta una cuenta para enviarlos.
          </>
        )}
      </p>
      <button type="button" onClick={() => setOpen((o) => !o)} className="text-xs text-neon underline">
        {open ? "Ocultar configuración" : status.configured ? "Cambiar configuración" : "Configurar ahora"}
      </button>

      {open && (
        <div className="space-y-2">
          <div className="flex gap-2">
            {(["resend", "smtp"] as const).map((p) => (
              <button
                key={p}
                type="button"
                onClick={() => setF({ ...f, provider: p })}
                aria-pressed={f.provider === p}
                className={`rounded-full border px-3 py-1.5 text-xs font-semibold ${f.provider === p ? "border-neon bg-neon text-black" : "border-neutral-600 text-white"}`}
              >
                {p === "resend" ? "Resend (recomendado)" : "Gmail / otro correo (SMTP)"}
              </button>
            ))}
          </div>

          {f.provider === "resend" ? (
            <p className="text-[11px] leading-tight text-neutral-400">
              En resend.com crea una cuenta gratis, verifica tu dominio popebrand.cl (te dan 3 registros para agregar en tu proveedor del dominio) y crea una
              API key. Gratis hasta 3.000 correos al mes.
            </p>
          ) : (
            <p className="text-[11px] leading-tight text-neutral-400">
              Con Gmail: activa la verificación en 2 pasos en tu cuenta de Google, crea una «Contraseña de aplicación» y úsala aquí. Servidor
              <code> smtp.gmail.com</code>, puerto <code>465</code>, usuario tu correo completo.
            </p>
          )}

          <input value={f.fromName} onChange={(e) => setF({ ...f, fromName: e.target.value })} placeholder="Nombre que ve el cliente (POPE)" className={field} />
          <input value={f.fromEmail} onChange={(e) => setF({ ...f, fromEmail: e.target.value })} placeholder="Correo desde el que se envía (pedidos@popebrand.cl)" className={field} />
          <input value={f.replyTo} onChange={(e) => setF({ ...f, replyTo: e.target.value })} placeholder="Si el cliente responde, que le llegue a (opcional)" className={field} />

          {f.provider === "resend" ? (
            <input
              type="password"
              value={f.resendKey}
              onChange={(e) => setF({ ...f, resendKey: e.target.value })}
              placeholder={status.hasResendKey ? "API key guardada (déjala vacía para mantenerla)" : "API key de Resend (re_…)"}
              autoComplete="off"
              className={field}
            />
          ) : (
            <>
              <div className="grid grid-cols-3 gap-2">
                <input value={f.smtpHost} onChange={(e) => setF({ ...f, smtpHost: e.target.value })} placeholder="smtp.gmail.com" className={`col-span-2 ${field}`} />
                <input value={f.smtpPort} onChange={(e) => setF({ ...f, smtpPort: e.target.value })} placeholder="465" inputMode="numeric" className={field} />
              </div>
              <input value={f.smtpUser} onChange={(e) => setF({ ...f, smtpUser: e.target.value })} placeholder="Usuario (tu correo)" autoComplete="off" className={field} />
              <input
                type="password"
                value={f.smtpPass}
                onChange={(e) => setF({ ...f, smtpPass: e.target.value })}
                placeholder={status.hasSmtpPass ? "Contraseña guardada (déjala vacía para mantenerla)" : "Contraseña de aplicación"}
                autoComplete="off"
                className={field}
              />
            </>
          )}

          <button type="button" disabled={busy} onClick={() => call({ action: "save", config: { ...f, smtpPort: Number(f.smtpPort) || 465 } }, "Guardado. Manda una prueba para confirmar.")} className={btn}>
            {busy ? "Guardando…" : "Guardar"}
          </button>
        </div>
      )}

      {status.configured && (
        <div className="space-y-2">
          <input value={testTo} onChange={(e) => setTestTo(e.target.value)} placeholder="Tu correo para recibir una prueba" className={field} />
          <button type="button" disabled={busy || !testTo.trim()} onClick={() => call({ action: "test", to: testTo }, "Prueba enviada: revisa tu correo (y el spam).")} className={btn}>
            {busy ? "Enviando…" : "Enviar correo de prueba"}
          </button>
        </div>
      )}
      {message && <p className="text-neon">{message}</p>}
    </div>
  );
}
