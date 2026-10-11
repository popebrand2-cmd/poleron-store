"use client";

import { useEffect, useState } from "react";

type Status = { hasToken: boolean; bot: string | null; chats: { id: string; name: string }[] };

// Owner-only: connects a Telegram bot so each new sale arrives as a Telegram message (with whatever sound the owner sets for
// that chat in Telegram).
export default function TelegramSetup() {
  const [status, setStatus] = useState<Status | null>(null);
  const [forbidden, setForbidden] = useState(false);
  const [token, setToken] = useState("");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");

  async function load() {
    const res = await fetch("/api/admin/telegram");
    if (res.status === 403) {
      setForbidden(true);
      return;
    }
    if (res.ok) setStatus(await res.json());
  }
  useEffect(() => {
    load();
  }, []);

  async function act(action: string, extra?: Record<string, string>, ok?: string) {
    setBusy(true);
    setMessage("");
    try {
      const res = await fetch("/api/admin/telegram", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action, ...extra }) });
      const data = (await res.json()) as { error?: string; sent?: number; ok?: boolean };
      if (!res.ok) throw new Error(data.error ?? "No se pudo completar.");
      if (action === "test" && !data.sent) throw new Error("No se pudo enviar. Revisa que sigas conectada.");
      if (action === "token") setToken("");
      setMessage(ok ?? "Listo.");
      await load();
    } catch (e) {
      setMessage(e instanceof Error ? e.message : "No se pudo completar.");
    } finally {
      setBusy(false);
    }
  }

  if (forbidden || !status) return null;
  const connected = status.chats.length > 0;
  const btn = "rounded-full bg-neon px-4 py-2 text-xs font-bold uppercase text-black disabled:opacity-50";

  return (
    <div className="space-y-2 border-t border-white/10 pt-3">
      <p className="text-xs font-bold uppercase tracking-wide text-neon">Avisos por Telegram (con tu propio sonido)</p>

      {connected ? (
        <>
          <p>
            Conectado con: <strong>{status.chats.map((c) => c.name).join(", ")}</strong>. Para ponerle un sonido propio: en Telegram abre el chat con
            el bot → toca su nombre → <strong>Notificaciones</strong> → <strong>Sonido</strong>.
          </p>
          <div className="flex flex-wrap items-center gap-3">
            <button type="button" disabled={busy} onClick={() => act("test", undefined, "Prueba enviada: mira tu Telegram.")} className={btn}>
              Enviar prueba
            </button>
            <button
              type="button"
              disabled={busy}
              onClick={() => confirm("¿Desconectar Telegram? Dejarás de recibir los avisos ahí.") && act("disconnect", undefined, "Desconectado.")}
              className="text-xs text-neutral-400 underline"
            >
              Desconectar
            </button>
          </div>
        </>
      ) : status.hasToken ? (
        <>
          <p>
            Bot guardado{status.bot ? ` (@${status.bot})` : ""}. Ahora ábrelo en Telegram
            {status.bot && (
              <>
                {" "}
                (<a href={`https://t.me/${status.bot}`} target="_blank" rel="noopener noreferrer" className="text-neon underline">t.me/{status.bot}</a>)
              </>
            )}
            , toca <strong>Iniciar</strong> (Start) y vuelve aquí.
          </p>
          <button type="button" disabled={busy} onClick={() => act("connect", undefined, "Conectado. Te mandamos un mensaje a Telegram.")} className={btn}>
            {busy ? "Conectando…" : "Ya le escribí: conectar"}
          </button>
        </>
      ) : (
        <>
          <ol className="list-decimal space-y-1 pl-5">
            <li>En Telegram busca <strong>@BotFather</strong> y escríbele <code>/newbot</code>.</li>
            <li>Ponle un nombre (por ejemplo «POPE Ventas») y un usuario que termine en <code>bot</code>.</li>
            <li>BotFather te da un <strong>token</strong> (números, dos puntos y letras). Pégalo aquí:</li>
          </ol>
          <input
            value={token}
            onChange={(e) => setToken(e.target.value)}
            placeholder="123456789:AAH…"
            autoComplete="off"
            className="w-full rounded-lg border border-neutral-700 bg-neutral-900 px-3 py-2 text-xs text-white focus:border-neon focus:outline-none"
          />
          <button type="button" disabled={busy || !token.trim()} onClick={() => act("token", { token }, "Bot guardado. Falta el último paso.")} className={btn}>
            {busy ? "Guardando…" : "Guardar token"}
          </button>
        </>
      )}
      {message && <p className="text-neon">{message}</p>}
    </div>
  );
}
