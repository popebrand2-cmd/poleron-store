"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { SITE_IMAGE_DEFAULTS, SITE_IMAGE_LABELS } from "@/lib/site-content";
import { saveSiteText, uploadSiteImage, uploadSiteVideo } from "@/lib/site-edit-client";
import { useSiteImage, useSiteText } from "@/components/SiteContentProvider";
import { setPopupPreview } from "@/lib/popup-preview";

function ImageSlot({ k }: { k: string }) {
  const router = useRouter();
  const current = useSiteImage(k);
  const meta = SITE_IMAGE_LABELS[k];
  const input = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const isDefault = current === SITE_IMAGE_DEFAULTS[k];

  async function replace(file: File) {
    setBusy(true);
    setError("");
    try {
      const url = await uploadSiteImage(file);
      await saveSiteText(k, url);
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "No se pudo subir la imagen.");
    } finally {
      setBusy(false);
    }
  }

  async function restore() {
    setBusy(true);
    await saveSiteText(k, SITE_IMAGE_DEFAULTS[k]);
    router.refresh();
    setBusy(false);
  }

  return (
    <li className="flex items-center gap-3">
      <span className="flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-lg bg-neutral-800">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        {current ? <img src={current} alt="" className="max-h-full max-w-full object-contain" /> : <span className="text-lg text-neutral-500">+</span>}
      </span>
      <div className="min-w-0 flex-1">
        <p className="truncate text-xs font-semibold text-white">{meta.label}</p>
        <p className="text-[11px] leading-tight text-neutral-400">{error || meta.hint}</p>
      </div>
      <div className="flex shrink-0 flex-col gap-1">
        <button
          type="button"
          disabled={busy}
          onClick={() => input.current?.click()}
          className="rounded-full bg-neon px-3 py-1 text-[11px] font-bold uppercase text-black disabled:opacity-50"
        >
          {busy ? "Subiendo…" : current ? "Cambiar" : "Subir"}
        </button>
        {!isDefault && (
          <button type="button" disabled={busy} onClick={restore} className="text-[11px] text-neutral-400 underline hover:text-white">
            {SITE_IMAGE_DEFAULTS[k] ? "Restaurar" : "Quitar"}
          </button>
        )}
      </div>
      <input
        ref={input}
        type="file"
        accept="image/png,image/jpeg,image/webp,image/svg+xml"
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0];
          e.target.value = "";
          if (file) replace(file);
        }}
      />
    </li>
  );
}

function VideoSlot({ n }: { n: number }) {
  const router = useRouter();
  const src = useSiteText(`video.${n}.src`);
  const input = useRef<HTMLInputElement>(null);
  const [pct, setPct] = useState<number | null>(null);
  const [error, setError] = useState("");

  async function upload(file: File) {
    setError("");
    setPct(0);
    try {
      const url = await uploadSiteVideo(file, setPct);
      await saveSiteText(`video.${n}.src`, url);
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "No se pudo subir el video.");
    } finally {
      setPct(null);
    }
  }

  async function remove() {
    await saveSiteText(`video.${n}.src`, "");
    router.refresh();
  }

  return (
    <li className="space-y-2 rounded-xl border border-white/10 p-2.5">
      <div className="flex items-center gap-3">
        <span className="flex h-16 w-9 shrink-0 items-center justify-center overflow-hidden rounded-md bg-neutral-800">
          {src ? (
            <video src={`${src}#t=0.1`} muted playsInline preload="metadata" className="h-full w-full object-cover" />
          ) : (
            <span className="text-lg text-neutral-500">+</span>
          )}
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-xs font-semibold text-white">Video {n}</p>
          <p className="text-[11px] leading-tight text-neutral-400">
            {error || (pct !== null ? `Subiendo… ${pct}%` : "Vertical (9:16), MP4, hasta 60 MB.")}
          </p>
        </div>
        <div className="flex shrink-0 flex-col gap-1">
          <button
            type="button"
            disabled={pct !== null}
            onClick={() => input.current?.click()}
            className="rounded-full bg-neon px-3 py-1 text-[11px] font-bold uppercase text-black disabled:opacity-50"
          >
            {src ? "Cambiar" : "Subir"}
          </button>
          {src && pct === null && (
            <button type="button" onClick={remove} className="text-[11px] text-neutral-400 underline hover:text-white">
              Quitar
            </button>
          )}
        </div>
        <input
          ref={input}
          type="file"
          accept="video/mp4,video/webm,video/quicktime"
          className="hidden"
          onChange={(e) => {
            const file = e.target.files?.[0];
            e.target.value = "";
            if (file) upload(file);
          }}
        />
      </div>
      {src && (
        <div className="grid grid-cols-2 gap-2">
          <SettingField k={`video.${n}.tag`} label="Sección" optional placeholder="Polerones" />
          <SettingField k={`video.${n}.caption`} label="Título" optional placeholder="Polerón Oversize" />
        </div>
      )}
    </li>
  );
}

function SettingField({ k, label, multiline, optional, placeholder }: { k: string; label: string; multiline?: boolean; optional?: boolean; placeholder?: string }) {
  const router = useRouter();
  const saved = useSiteText(k);
  const [value, setValue] = useState(saved);
  const [status, setStatus] = useState("");

  async function save() {
    const next = value.trim();
    if ((!next && !optional) || next === saved) return;
    await saveSiteText(k, next);
    setStatus("Guardado");
    router.refresh();
    setTimeout(() => setStatus(""), 1500);
  }

  const common = {
    value,
    onChange: (e: React.ChangeEvent<HTMLInputElement & HTMLTextAreaElement>) => setValue(e.target.value),
    onBlur: save,
    placeholder,
    className: "w-full rounded-lg border border-neutral-700 bg-neutral-900 px-3 py-2 text-xs text-white focus:border-neon focus:outline-none",
  };

  return (
    <label className="block">
      <span className="mb-1 flex items-center justify-between text-xs font-semibold text-white">
        {label}
        {status && <span className="text-[11px] font-normal text-neon">{status}</span>}
      </span>
      {multiline ? <textarea rows={2} {...common} /> : <input type="text" {...common} />}
    </label>
  );
}

function PopupSettings() {
  const router = useRouter();
  const enabled = useSiteText("popup.enabled") === "1";

  async function toggle(next: boolean) {
    await saveSiteText("popup.enabled", next ? "1" : "0");
    router.refresh();
  }

  return (
    <div className="space-y-3 border-t border-white/10 pt-3">
      <p className="text-xs font-bold uppercase tracking-wide text-neon">Popup de oferta</p>
      <label className="flex cursor-pointer items-center gap-2 text-xs font-semibold text-white">
        <input type="checkbox" checked={enabled} onChange={(e) => toggle(e.target.checked)} className="h-4 w-4 accent-[var(--neon)]" />
        Mostrar el popup a los visitantes
      </label>
      <p className="text-[11px] leading-tight text-neutral-400">
        Apagado por defecto. Edita sus textos con «Ver popup», y actívalo cuando tu oferta esté lista.
      </p>
      <button
        type="button"
        onClick={() => setPopupPreview(true)}
        className="rounded-full bg-neon px-3 py-1.5 text-[11px] font-bold uppercase text-black"
      >
        Ver popup
      </button>
      <SettingField k="popup.link" label="A dónde lleva el botón" placeholder="/#tienda o /productos/hoodie-oversize" />
      <SettingField k="popup.delay" label="Segundos antes de aparecer" placeholder="4" />
    </div>
  );
}

// Everything that isn't plain text on the page: pictures and contact settings.
export default function SiteAssetsPanel({ defaultOpen = false }: { defaultOpen?: boolean }) {
  return (
    <details open={defaultOpen} className="glass-dark w-[min(92vw,26rem)] rounded-2xl text-white">
      <summary className="cursor-pointer select-none px-4 py-2.5 text-xs font-bold uppercase tracking-wide">
        Imágenes y contacto
      </summary>
      <div className="max-h-[55vh] space-y-4 overflow-y-auto px-4 pb-4">
        <ul className="space-y-3">
          {Object.keys(SITE_IMAGE_LABELS).map((k) => (
            <ImageSlot key={k} k={k} />
          ))}
        </ul>
        <div className="space-y-3 border-t border-white/10 pt-3">
          <p className="text-xs font-bold uppercase tracking-wide text-neon">Videos verticales (pruebas reales)</p>
          <p className="text-[11px] leading-tight text-neutral-400">
            Aparecen en la portada como cartas. «Sección» agrupa las cartas (por ejemplo Polerones o Poleras): si escribes secciones, se crean filtros solos.
          </p>
          <ul className="space-y-2">
            {Array.from({ length: 8 }, (_, i) => (
              <VideoSlot key={i} n={i + 1} />
            ))}
          </ul>
        </div>
        <div className="space-y-3 border-t border-white/10 pt-3">
          <SettingField k="setting.instagramUrl" label="Enlace de Instagram" optional placeholder="https://instagram.com/tu_usuario" />
          <SettingField k="setting.facebookUrl" label="Enlace de Facebook" optional placeholder="https://facebook.com/tu_pagina" />
          <SettingField k="setting.whatsappNumber" label="Número de WhatsApp (con código de país)" />
          <SettingField k="setting.whatsappMessage" label="Mensaje inicial de WhatsApp" multiline />
        </div>
        <PopupSettings />
      </div>
    </details>
  );
}
