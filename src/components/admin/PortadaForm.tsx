"use client";

import { useState } from "react";

export default function PortadaForm({ initialHeroImageUrl }: { initialHeroImageUrl: string }) {
  const [heroImageUrl, setHeroImageUrl] = useState(initialHeroImageUrl);
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [saved, setSaved] = useState(false);

  async function handleFile(file: File) {
    setUploading(true);
    setError("");
    setSaved(false);
    try {
      const formData = new FormData();
      formData.append("file", file);
      const res = await fetch("/api/upload", { method: "POST", body: formData });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "No se pudo subir la imagen.");
        return;
      }
      setHeroImageUrl(data.url);
    } finally {
      setUploading(false);
    }
  }

  async function handleSave() {
    setSaving(true);
    setError("");
    setSaved(false);
    try {
      const res = await fetch("/api/admin/hero", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ heroImageUrl }),
      });
      if (!res.ok) {
        const data = await res.json();
        setError(data.error ?? "No se pudo guardar.");
        return;
      }
      setSaved(true);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="max-w-xl rounded-xl border border-neutral-200 bg-white p-6">
      <h2 className="mb-1 text-lg font-semibold">Foto principal del inicio</h2>
      <p className="mb-4 text-sm text-neutral-500">
        La foto que se muestra grande en la portada de la tienda (idealmente una foto real de alguien usando la
        prenda — vertical u horizontal, buena resolución). Mientras no subas una, se muestra un fondo de reemplazo.
      </p>

      <div className="mb-4 aspect-[4/5] w-full max-w-xs overflow-hidden rounded-lg border border-neutral-200 bg-neutral-100">
        {heroImageUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={heroImageUrl} alt="Foto del inicio" className="h-full w-full object-cover" />
        ) : (
          <div className="flex h-full w-full items-center justify-center text-center text-sm text-neutral-400">
            Sin foto todavía
          </div>
        )}
      </div>

      <label className="inline-block cursor-pointer rounded-md border border-neutral-300 px-4 py-2 text-sm font-medium hover:bg-neutral-50">
        {uploading ? "Subiendo..." : heroImageUrl ? "Cambiar foto" : "Subir foto"}
        <input
          type="file"
          accept="image/png,image/jpeg,image/webp"
          className="hidden"
          disabled={uploading}
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) handleFile(file);
          }}
        />
      </label>
      {heroImageUrl && (
        <button
          type="button"
          onClick={() => {
            setHeroImageUrl("");
            setSaved(false);
          }}
          className="ml-3 text-sm text-red-600 hover:underline"
        >
          Quitar foto
        </button>
      )}

      {error && <p className="mt-3 text-sm text-red-600">{error}</p>}

      <div className="mt-6 flex items-center gap-3">
        <button
          type="button"
          onClick={handleSave}
          disabled={saving || uploading}
          className="rounded-md bg-neutral-900 px-5 py-2 text-sm font-medium text-white disabled:opacity-50"
        >
          {saving ? "Guardando..." : "Guardar cambios"}
        </button>
        {saved && <span className="text-sm text-emerald-600">Guardado.</span>}
      </div>
    </div>
  );
}
