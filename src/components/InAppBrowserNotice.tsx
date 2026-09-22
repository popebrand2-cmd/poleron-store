"use client";

import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { detectInAppBrowser, type InAppApp } from "@/lib/in-app-browser";

const MENU_HINT: Record<InAppApp, string> = {
  Instagram: "los tres puntos (•••) arriba a la derecha",
  Facebook: "los tres puntos (•••) arriba a la derecha",
  TikTok: "los tres puntos (•••) abajo a la derecha",
  Line: "el menú (⋮ o Compartir) de arriba",
};

// A slim, dismissible banner that only shows inside Instagram/Facebook/TikTok/Line's own
// browser — where the photo upload silently doesn't work — telling the visitor how to open the
// real Safari/Chrome instead. Invisible everywhere else, including the admin panel.
export default function InAppBrowserNotice() {
  const pathname = usePathname();
  const [app, setApp] = useState<InAppApp | null>(null);
  const [dismissed, setDismissed] = useState(false);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    setApp(detectInAppBrowser(navigator.userAgent));
  }, []);

  if (!app || dismissed || pathname?.startsWith("/admin")) return null;

  async function copyLink() {
    try {
      await navigator.clipboard.writeText(window.location.href);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    } catch {
      setCopied(false);
    }
  }

  return (
    <div className="relative z-40 flex flex-col items-center gap-2 bg-[#102200] px-4 py-3 text-center text-sm text-white sm:flex-row sm:justify-center">
      <p className="leading-snug">
        <strong className="text-neon">Estás en el navegador de {app}.</strong> Ahí no se puede subir tu diseño. Toca {MENU_HINT[app]} y elige{" "}
        <strong>“Abrir en el navegador”</strong> (Safari o Chrome).
      </p>
      <div className="flex shrink-0 items-center gap-2">
        <button
          type="button"
          onClick={copyLink}
          className="rounded-full bg-neon px-3 py-1.5 text-xs font-bold uppercase tracking-wide text-black"
        >
          {copied ? "Enlace copiado" : "Copiar enlace"}
        </button>
        <button
          type="button"
          onClick={() => setDismissed(true)}
          aria-label="Cerrar aviso"
          className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-white/70 hover:text-white"
        >
          ✕
        </button>
      </div>
    </div>
  );
}
