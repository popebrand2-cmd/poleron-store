"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { SITE_IMAGE_DEFAULTS, SITE_IMAGE_LABELS } from "@/lib/site-content";
import { saveSiteText, uploadSiteImage } from "@/lib/site-edit-client";
import { useSiteImage, useSiteText } from "@/components/SiteContentProvider";

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
        <img src={current} alt="" className="max-h-full max-w-full object-contain" />
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
          {busy ? "Subiendo…" : "Cambiar"}
        </button>
        {!isDefault && (
          <button type="button" disabled={busy} onClick={restore} className="text-[11px] text-neutral-400 underline hover:text-white">
            Restaurar
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
          <SettingField k="setting.instagramUrl" label="Enlace de Instagram" optional placeholder="https://instagram.com/tu_usuario" />
          <SettingField k="setting.facebookUrl" label="Enlace de Facebook" optional placeholder="https://facebook.com/tu_pagina" />
          <SettingField k="setting.whatsappNumber" label="Número de WhatsApp (con código de país)" />
          <SettingField k="setting.whatsappMessage" label="Mensaje inicial de WhatsApp" multiline />
        </div>
      </div>
    </details>
  );
}
