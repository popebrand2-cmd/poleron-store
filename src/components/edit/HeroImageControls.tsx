"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { patchHero } from "@/lib/site-edit-client";

export default function HeroImageControls({
  initialAlign,
  initialPosX,
  initialPosY,
  initialZoom,
}: {
  initialAlign: "left" | "right";
  initialPosX: number;
  initialPosY: number;
  initialZoom: number;
}) {
  const router = useRouter();
  const [align, setAlign] = useState(initialAlign);
  const [posX, setPosX] = useState(initialPosX);
  const [posY, setPosY] = useState(initialPosY);
  const [zoom, setZoom] = useState(initialZoom);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  function applyLive(nextPosX: number, nextPosY: number, nextZoom: number) {
    const img = document.getElementById("hero-photo") as HTMLElement | null;
    if (img) {
      img.style.objectPosition = `${nextPosX}% ${nextPosY}%`;
      img.style.transform = `scale(${nextZoom})`;
      img.style.transformOrigin = `${nextPosX}% ${nextPosY}%`;
    }
  }

  function commit(fields: Record<string, number>) {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => patchHero(fields), 350);
  }

  function handlePosX(v: number) {
    setPosX(v);
    applyLive(v, posY, zoom);
    commit({ heroImagePosX: v });
  }
  function handlePosY(v: number) {
    setPosY(v);
    applyLive(posX, v, zoom);
    commit({ heroImagePosY: v });
  }
  function handleZoom(v: number) {
    setZoom(v);
    applyLive(posX, posY, v);
    commit({ heroImageZoom: v });
  }

  async function handleAlign(next: "left" | "right") {
    setAlign(next);
    await patchHero({ heroImageAlign: next });
    router.refresh();
  }

  async function handleFile(file: File) {
    setUploading(true);
    try {
      const formData = new FormData();
      formData.append("file", file);
      const res = await fetch("/api/upload", { method: "POST", body: formData });
      const data = await res.json();
      if (res.ok) {
        await patchHero({ heroImageUrl: data.url });
        router.refresh();
      }
    } finally {
      setUploading(false);
    }
  }

  return (
    <div className="w-64 rounded-2xl bg-neutral-900 p-4 shadow-lg ring-1 ring-neutral-700">
      <p className="mb-3 text-xs font-bold uppercase tracking-wide text-neutral-300">Foto de portada</p>

      <button
        type="button"
        onClick={() => fileInputRef.current?.click()}
        disabled={uploading}
        className="mb-3 w-full rounded-full border border-neutral-600 py-1.5 text-xs font-bold uppercase text-white transition hover:border-neon disabled:opacity-50"
      >
        {uploading ? "Subiendo..." : "Cambiar foto"}
      </button>
      <input
        ref={fileInputRef}
        type="file"
        accept="image/png,image/jpeg,image/webp"
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) handleFile(file);
        }}
      />

      <div className="mb-3 flex gap-2 text-[11px]">
        <button
          type="button"
          onClick={() => handleAlign("left")}
          className={`flex-1 rounded-full border py-1 font-bold uppercase transition ${
            align === "left" ? "border-neon text-neon" : "border-neutral-600 text-neutral-400"
          }`}
        >
          Izquierda
        </button>
        <button
          type="button"
          onClick={() => handleAlign("right")}
          className={`flex-1 rounded-full border py-1 font-bold uppercase transition ${
            align === "right" ? "border-neon text-neon" : "border-neutral-600 text-neutral-400"
          }`}
        >
          Derecha
        </button>
      </div>

      <label className="mb-1 block text-[11px] text-neutral-400">Posición horizontal</label>
      <input
        type="range"
        min={0}
        max={100}
        value={posX}
        onChange={(e) => handlePosX(Number(e.target.value))}
        className="mb-2 w-full accent-neon"
      />

      <label className="mb-1 block text-[11px] text-neutral-400">Posición vertical</label>
      <input
        type="range"
        min={0}
        max={100}
        value={posY}
        onChange={(e) => handlePosY(Number(e.target.value))}
        className="mb-2 w-full accent-neon"
      />

      <label className="mb-1 block text-[11px] text-neutral-400">Zoom</label>
      <input
        type="range"
        min={100}
        max={200}
        value={zoom * 100}
        onChange={(e) => handleZoom(Number(e.target.value) / 100)}
        className="w-full accent-neon"
      />
    </div>
  );
}
