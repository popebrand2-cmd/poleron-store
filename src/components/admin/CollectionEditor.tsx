"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import BulkDesignUpload, { ORIGINS } from "@/components/admin/BulkDesignUpload";

type Design = {
  id: string;
  name: string;
  imageUrl: string;
  placement: "FRONT" | "BACK";
  active: boolean;
  backImageUrl: string;
  origin: string;
  sourceNote: string;
  garmentColors: string;
};

type Collection = {
  id: string;
  name: string;
  active: boolean;
  category: string;
  photoUrl: string;
  designs: Design[];
};

export default function CollectionEditor({ collection, categories }: { collection: Collection; categories: string[] }) {
  const router = useRouter();
  const [active, setActive] = useState(collection.active);
  const [savingActive, setSavingActive] = useState(false);
  const [category, setCategory] = useState(collection.category);
  const [savingCategory, setSavingCategory] = useState(false);
  const [categorySaved, setCategorySaved] = useState(false);

  async function saveCategory() {
    setSavingCategory(true);
    setCategorySaved(false);
    try {
      await fetch(`/api/admin/collections/${collection.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ category }),
      });
      setCategorySaved(true);
      router.refresh();
    } finally {
      setSavingCategory(false);
    }
  }

  const [photoUrl, setPhotoUrl] = useState(collection.photoUrl);
  const [photoBusy, setPhotoBusy] = useState(false);
  const [photoError, setPhotoError] = useState("");

  async function savePhoto(file: File | null) {
    setPhotoBusy(true);
    setPhotoError("");
    try {
      let url = "";
      if (file) {
        const formData = new FormData();
        formData.append("file", file);
        const up = await fetch("/api/upload", { method: "POST", body: formData });
        const data = await up.json();
        if (!up.ok || !data.url) throw new Error(data.error ?? "No se pudo subir la foto.");
        url = data.url;
      }
      await fetch(`/api/admin/collections/${collection.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ photoUrl: url }),
      });
      setPhotoUrl(url);
      router.refresh();
    } catch (e) {
      setPhotoError(e instanceof Error ? e.message : "No se pudo guardar la foto.");
    } finally {
      setPhotoBusy(false);
    }
  }

  const [name, setName] = useState("");
  const [placement, setPlacement] = useState<"FRONT" | "BACK">("FRONT");
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState("");

  async function toggleActive() {
    setSavingActive(true);
    const next = !active;
    try {
      await fetch(`/api/admin/collections/${collection.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ active: next }),
      });
      setActive(next);
    } finally {
      setSavingActive(false);
    }
  }

  async function handleAddDesign(e: React.FormEvent) {
    e.preventDefault();
    if (!file) {
      setError("Elige una imagen.");
      return;
    }
    setUploading(true);
    setError("");
    try {
      const formData = new FormData();
      formData.append("file", file);
      const uploadRes = await fetch("/api/upload", { method: "POST", body: formData });
      const uploadData = await uploadRes.json();
      if (!uploadRes.ok) {
        setError(uploadData.error ?? "No se pudo subir la imagen.");
        return;
      }

      const res = await fetch(`/api/admin/collections/${collection.id}/designs`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, imageUrl: uploadData.url, placement }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "No se pudo agregar el diseño.");
        return;
      }

      setName("");
      setFile(null);
      router.refresh();
    } finally {
      setUploading(false);
    }
  }

  async function handleDeleteDesign(id: string) {
    await fetch(`/api/admin/designs/${id}`, { method: "DELETE" });
    router.refresh();
  }

  async function handleToggleDesignActive(design: Design) {
    if (!design.active && design.origin === "sin-confirmar" && !window.confirm("Este diseño está marcado «sin confirmar»: no se sabe si tienes permiso para imprimirlo. ¿Publicarlo igual?")) return;
    await fetch(`/api/admin/designs/${design.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ active: !design.active }),
    });
    router.refresh();
  }

  async function handleOrigin(design: Design, origin: string) {
    // Marking a design "sin confirmar" takes it off the store; the other origins leave it as it is (use Mostrar to publish).
    await fetch(`/api/admin/designs/${design.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(origin === "sin-confirmar" ? { origin, active: false } : { origin }),
    });
    router.refresh();
  }

  async function handleTone(design: Design, garmentColors: string) {
    await fetch(`/api/admin/designs/${design.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ garmentColors }),
    });
    router.refresh();
  }

  const front = collection.designs.filter((d) => d.placement === "FRONT");
  const back = collection.designs.filter((d) => d.placement === "BACK");

  return (
    <div className="space-y-8">
      <div className="flex items-center gap-3 rounded-xl border border-neutral-200 bg-white p-4">
        <label className="flex items-center gap-2 text-sm font-medium">
          <input type="checkbox" checked={active} disabled={savingActive} onChange={toggleActive} />
          Colección visible para clientes
        </label>
      </div>

      <div className="space-y-2 rounded-xl border border-neutral-200 bg-white p-4">
        <label className="block text-sm font-medium">Foto del artista</label>
        <p className="text-sm text-neutral-500">
          Es la imagen grande que se ve arriba en la página de la colección y en el carrusel de la portada. Si no subes ninguna, se usa el primer diseño.
        </p>
        <div className="flex items-center gap-4">
          {photoUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={photoUrl} alt="Foto del artista" className="h-28 w-20 rounded-lg object-cover" />
          ) : (
            <div className="flex h-28 w-20 items-center justify-center rounded-lg border border-dashed border-neutral-300 text-xs text-neutral-400">Sin foto</div>
          )}
          <div className="flex flex-col items-start gap-2">
            <input
              type="file"
              accept="image/png,image/jpeg,image/webp"
              disabled={photoBusy}
              onChange={(e) => {
                const f = e.target.files?.[0];
                e.target.value = "";
                if (f) savePhoto(f);
              }}
              className="text-sm"
            />
            {photoUrl && (
              <button type="button" disabled={photoBusy} onClick={() => savePhoto(null)} className="text-xs text-neutral-500 underline">
                Quitar foto
              </button>
            )}
            {photoBusy && <span className="text-xs text-neutral-500">Guardando…</span>}
            {photoError && <span className="text-xs text-red-600">{photoError}</span>}
          </div>
        </div>
      </div>

      <div className="space-y-2 rounded-xl border border-neutral-200 bg-white p-4">
        <label className="block text-sm font-medium">Sección en la página principal</label>
        <p className="text-sm text-neutral-500">
          Escribe una sección nueva (ej. Reguetón, Anime, Navidad) o elige una existente. Las colecciones con la misma sección aparecen
          juntas en una pestaña. La <strong>primera imagen</strong> de la colección es la portada que se ve en el carrusel.
        </p>
        <div className="flex items-center gap-3">
          <input
            list="secciones-editor"
            value={category}
            onChange={(e) => {
              setCategory(e.target.value);
              setCategorySaved(false);
            }}
            placeholder="Sin sección (se agrupa en «Otros»)"
            className="w-full max-w-xs rounded-md border border-neutral-300 px-3 py-2"
          />
          <datalist id="secciones-editor">
            {categories.map((c) => (
              <option key={c} value={c} />
            ))}
          </datalist>
          <button
            type="button"
            onClick={saveCategory}
            disabled={savingCategory}
            className="rounded-md bg-neutral-900 px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
          >
            {savingCategory ? "Guardando..." : "Guardar sección"}
          </button>
          {categorySaved && <span className="text-sm text-emerald-600">Guardado</span>}
        </div>
      </div>

      <BulkDesignUpload collectionId={collection.id} onDone={() => router.refresh()} />

      <form onSubmit={handleAddDesign} className="space-y-4 rounded-xl border border-neutral-200 bg-white p-6">
        <h2 className="text-lg font-semibold">Agregar diseño</h2>
        <div>
          <label className="mb-1 block text-sm font-medium">Nombre (referencia interna)</label>
          <input
            required
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Ej. Águila gótica"
            className="w-full max-w-sm rounded-md border border-neutral-300 px-3 py-2"
          />
        </div>
        <div>
          <p className="mb-1 text-sm font-medium">Va para</p>
          <div className="flex gap-4 text-sm">
            <label className="flex items-center gap-2">
              <input
                type="radio"
                name="placement"
                checked={placement === "FRONT"}
                onChange={() => setPlacement("FRONT")}
              />
              Adelante (el cliente elige izquierda / centro / derecha del pecho)
            </label>
            <label className="flex items-center gap-2">
              <input
                type="radio"
                name="placement"
                checked={placement === "BACK"}
                onChange={() => setPlacement("BACK")}
              />
              Atrás (tamaño fijo debajo de la capucha)
            </label>
          </div>
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium">Imagen del diseño (PNG con fondo transparente idealmente, o foto JPG)</label>
          <input
            required
            type="file"
            accept="image/png,image/jpeg,image/webp"
            onChange={(e) => setFile(e.target.files?.[0] ?? null)}
            className="text-sm"
          />
        </div>
        {error && <p className="text-sm text-red-600">{error}</p>}
        <button
          type="submit"
          disabled={uploading}
          className="rounded-md bg-neutral-900 px-5 py-2 text-sm font-medium text-white disabled:opacity-50"
        >
          {uploading ? "Subiendo..." : "Agregar diseño"}
        </button>
      </form>

      <DesignGrid title="Diseños para adelante" designs={front} onDelete={handleDeleteDesign} onToggle={handleToggleDesignActive} onOrigin={handleOrigin} onTone={handleTone} />
      <DesignGrid title="Diseños para atrás" designs={back} onDelete={handleDeleteDesign} onToggle={handleToggleDesignActive} onOrigin={handleOrigin} onTone={handleTone} />
    </div>
  );
}

function DesignGrid({
  title,
  designs,
  onDelete,
  onToggle,
  onOrigin,
  onTone,
}: {
  title: string;
  designs: Design[];
  onDelete: (id: string) => void;
  onToggle: (d: Design) => void;
  onOrigin: (d: Design, origin: string) => void;
  onTone: (d: Design, tone: string) => void;
}) {
  if (designs.length === 0) return null;
  return (
    <div>
      <h3 className="mb-3 text-sm font-semibold uppercase tracking-wide text-neutral-500">{title}</h3>
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4">
        {designs.map((d) => (
          <div key={d.id} className="rounded-lg border border-neutral-200 bg-white p-3">
            <div className="mb-2 flex aspect-square items-center justify-center overflow-hidden rounded-md bg-neutral-100">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={d.imageUrl} alt={d.name} className="h-full w-full object-contain" />
            </div>
            <p className="truncate text-sm font-medium">{d.name}</p>
            {!d.active && <p className="mt-0.5 text-[11px] font-semibold uppercase text-amber-700">No publicado</p>}
            <select
              value={d.garmentColors || ""}
              onChange={(e) => onTone(d, e.target.value)}
              aria-label="Prendas donde se ve bien"
              title="En qué colores de prenda se muestra este diseño"
              className="mt-1 w-full rounded border border-neutral-300 px-1 py-1 text-[11px]"
            >
              <option value="">Negras y blancas</option>
              <option value="negro">Solo negras</option>
              <option value="blanco">Solo blancas</option>
            </select>
            <select
              value={d.origin || ""}
              onChange={(e) => onOrigin(d, e.target.value)}
              aria-label="Origen del diseño"
              title={d.sourceNote || "Origen del diseño"}
              className={`mt-1 w-full rounded border px-1 py-1 text-[11px] ${d.origin === "sin-confirmar" || !d.origin ? "border-amber-400 bg-amber-50" : "border-neutral-300"}`}
            >
              <option value="">Origen sin registrar</option>
              {ORIGINS.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>
            <div className="mt-2 flex items-center justify-between text-xs">
              <button onClick={() => onToggle(d)} className="text-neutral-600 hover:underline">
                {d.active ? "Ocultar" : "Mostrar"}
              </button>
              <button onClick={() => onDelete(d.id)} className="text-red-600 hover:underline">
                Eliminar
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
