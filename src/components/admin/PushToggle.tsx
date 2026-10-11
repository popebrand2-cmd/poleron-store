"use client";

import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";

// "Avisos de ventas": asks the phone for permission and registers it, so each new paid order arrives as a notification with the
// phone's own sound, even with the panel closed. On iPhone this only works once the panel is added to the Home Screen.
type State = "loading" | "unsupported" | "needs-install" | "off" | "on" | "denied";

function urlBase64ToUint8Array(base64: string): Uint8Array<ArrayBuffer> {
  const padded = (base64 + "=".repeat((4 - (base64.length % 4)) % 4)).replace(/-/g, "+").replace(/_/g, "/");
  const raw = atob(padded);
  const out = new Uint8Array(new ArrayBuffer(raw.length));
  for (let i = 0; i < raw.length; i++) out[i] = raw.charCodeAt(i);
  return out;
}

export default function PushToggle() {
  const pathname = usePathname() ?? "";
  const [state, setState] = useState<State>("loading");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [open, setOpen] = useState(false);

  useEffect(() => {
    let alive = true;
    (async () => {
      const ua = navigator.userAgent;
      const isIos = /iPhone|iPad|iPod/.test(ua);
      const standalone = window.matchMedia("(display-mode: standalone)").matches || (navigator as unknown as { standalone?: boolean }).standalone === true;
      if (!("serviceWorker" in navigator) || !("PushManager" in window) || !("Notification" in window)) {
        if (alive) setState(isIos && !standalone ? "needs-install" : "unsupported");
        return;
      }
      if (Notification.permission === "denied") {
        if (alive) setState("denied");
        return;
      }
      try {
        const reg = await navigator.serviceWorker.register("/sw.js");
        const sub = await reg.pushManager.getSubscription();
        if (alive) setState(sub && Notification.permission === "granted" ? "on" : "off");
      } catch {
        if (alive) setState("unsupported");
      }
    })();
    return () => {
      alive = false;
    };
  }, []);

  if (pathname.startsWith("/admin/login") || state === "loading") return null;

  async function enable() {
    setBusy(true);
    setMessage("");
    try {
      const permission = await Notification.requestPermission();
      if (permission !== "granted") {
        setState(permission === "denied" ? "denied" : "off");
        return;
      }
      const reg = await navigator.serviceWorker.register("/sw.js");
      await navigator.serviceWorker.ready;
      const keyRes = await fetch("/api/admin/push");
      const { publicKey } = (await keyRes.json()) as { publicKey: string };
      const sub =
        (await reg.pushManager.getSubscription()) ??
        (await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: urlBase64ToUint8Array(publicKey) }));
      const json = sub.toJSON() as { endpoint?: string; keys?: { p256dh?: string; auth?: string } };
      const res = await fetch("/api/admin/push", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ endpoint: json.endpoint, keys: json.keys }),
      });
      if (!res.ok) throw new Error("No se pudo guardar este teléfono.");
      setState("on");
      setMessage("Listo. Te mandamos una notificación de prueba.");
      await fetch("/api/admin/push", { method: "PUT", headers: { "Content-Type": "application/json" }, body: "{}" });
    } catch (e) {
      setMessage(e instanceof Error ? e.message : "No se pudieron activar los avisos.");
    } finally {
      setBusy(false);
    }
  }

  async function disable() {
    setBusy(true);
    try {
      const reg = await navigator.serviceWorker.getRegistration("/sw.js");
      const sub = await reg?.pushManager.getSubscription();
      if (sub) {
        await fetch("/api/admin/push", { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "unsubscribe", endpoint: sub.endpoint }) });
        await sub.unsubscribe();
      }
      setState("off");
      setMessage("");
    } finally {
      setBusy(false);
    }
  }

  async function test() {
    setBusy(true);
    setMessage("");
    try {
      const res = await fetch("/api/admin/push", { method: "PUT", headers: { "Content-Type": "application/json" }, body: "{}" });
      const data = (await res.json()) as { sent?: number };
      setMessage(data.sent ? "Prueba enviada." : "No hay ningún teléfono registrado.");
    } finally {
      setBusy(false);
    }
  }

  const label =
    state === "on" ? "🔔 Avisos de ventas: activados" : state === "denied" ? "🔕 Avisos bloqueados" : state === "needs-install" ? "🔔 Avisos de ventas en el iPhone" : "🔔 Activar avisos de ventas";

  return (
    <div className="mx-auto max-w-5xl px-4 pt-3 sm:px-6">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className={`rounded-full border px-4 py-1.5 text-xs font-semibold ${state === "on" ? "border-emerald-500 text-emerald-400" : "border-neon text-neon"}`}
        aria-expanded={open}
      >
        {label}
      </button>
      {(open || message) && (
        <div className="mt-2 space-y-2 rounded-xl border border-white/15 bg-black/60 p-3 text-sm text-neutral-300">
          {state === "off" && (
            <>
              <p>Cada venta nueva te llega como notificación al teléfono, con el sonido de tu celular, aunque tengas el panel cerrado.</p>
              <button type="button" disabled={busy} onClick={enable} className="rounded-full bg-neon px-4 py-2 text-xs font-bold uppercase text-black disabled:opacity-50">
                {busy ? "Activando…" : "Activar en este teléfono"}
              </button>
            </>
          )}
          {state === "on" && (
            <div className="flex flex-wrap items-center gap-3">
              <button type="button" disabled={busy} onClick={test} className="rounded-full bg-neon px-4 py-2 text-xs font-bold uppercase text-black disabled:opacity-50">
                Enviar prueba
              </button>
              <button type="button" disabled={busy} onClick={disable} className="text-xs text-neutral-400 underline">
                Desactivar en este teléfono
              </button>
            </div>
          )}
          {state === "needs-install" && (
            <p>
              En iPhone los avisos necesitan que agregues el panel a tu pantalla de inicio: abre esta página en <strong>Safari</strong>, toca el botón
              <strong> Compartir</strong> y elige <strong>«Agregar a pantalla de inicio»</strong>. Luego abre «POPE Admin» desde ese ícono y activa los avisos aquí.
            </p>
          )}
          {state === "denied" && <p>Bloqueaste las notificaciones de este sitio. Actívalas en los ajustes del navegador (o de la app) y vuelve a esta página.</p>}
          {state === "unsupported" && <p>Este navegador no permite avisos. Prueba con Chrome (Android) o Safari agregado a la pantalla de inicio (iPhone).</p>}
          {message && <p className="text-neon">{message}</p>}
        </div>
      )}
    </div>
  );
}
