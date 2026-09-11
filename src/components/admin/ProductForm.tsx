"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import ZoneEditor, { DEFAULT_ZONE, type Zone } from "./ZoneEditor";

const VIEW_LABEL_OPTIONS = ["Frente", "Espalda", "Manga izquierda", "Manga derecha"];

type ViewFormState = Zone & {
  label: string;
  imageUrl: string;
  allowRotate: boolean;
};

type ColorFormState = {
  name: string;
  hex: string;
  views: ViewFormState[];
};

type SizeFormState = {
  label: string;
  priceDelta: number;
};

type MaterialFormState = {
  label: string;
  priceDelta: number;
};

export type ProductFormInitial = {
  id: string;
  slug: string;
  name: string;
  description: string;
  basePrice: number;
  active: boolean;
  sizes: SizeFormState[];
  materials: MaterialFormState[];
  colors: ColorFormState[];
};

function slugify(text: string) {
  return text
    .toLowerCase()
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

function newColor(): ColorFormState {
  return { name: "", hex: "#111111", views: [] };
}

function newView(): ViewFormState {
  return { label: "Frente", imageUrl: "", allowRotate: true, ...DEFAULT_ZONE };
}

export default function ProductForm({ initial }: { initial?: ProductFormInitial }) {
  const router = useRouter();
  const isEdit = Boolean(initial);

  const [name, setName] = useState(initial?.name ?? "");
  const [slug, setSlug] = useState(initial?.slug ?? "");
  const [slugTouched, setSlugTouched] = useState(isEdit);
  const [description, setDescription] = useState(initial?.description ?? "");
  const [basePrice, setBasePrice] = useState(initial?.basePrice ?? 25000);
  const [active, setActive] = useState(initial?.active ?? true);
  const [sizes, setSizes] = useState<SizeFormState[]>(
    initial?.sizes ?? [
      { label: "S", priceDelta: 0 },
      { label: "M", priceDelta: 0 },
      { label: "L", priceDelta: 0 },
      { label: "XL", priceDelta: 2000 },
    ],
  );
  const [materials, setMaterials] = useState<MaterialFormState[]>(
    initial?.materials ?? [{ label: "DTF", priceDelta: 0 }],
  );
  const [colors, setColors] = useState<ColorFormState[]>(initial?.colors ?? [newColor()]);
  const [uploadingKey, setUploadingKey] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  function handleNameChange(value: string) {
    setName(value);
    if (!slugTouched) setSlug(slugify(value));
  }

  function updateColor(index: number, patch: Partial<ColorFormState>) {
    setColors((prev) => prev.map((c, i) => (i === index ? { ...c, ...patch } : c)));
  }

  function updateView(colorIndex: number, viewIndex: number, patch: Partial<ViewFormState>) {
    setColors((prev) =>
      prev.map((c, i) =>
        i !== colorIndex
          ? c
          : { ...c, views: c.views.map((v, j) => (j === viewIndex ? { ...v, ...patch } : v)) },
      ),
    );
  }

  async function handleImageUpload(colorIndex: number, viewIndex: number, file: File) {
    const key = `${colorIndex}-${viewIndex}`;
    setUploadingKey(key);
    setError("");
    try {
      const body = new FormData();
      body.append("file", file);
      const res = await fetch("/api/upload", { method: "POST", body });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Error al subir la imagen.");
      updateView(colorIndex, viewIndex, { imageUrl: data.url });
    } catch (e) {
      setError(e instanceof Error ? e.message : "Error al subir la imagen.");
    } finally {
      setUploadingKey(null);
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");

    if (!name.trim() || !slug.trim()) {
      setError("Nombre y slug son obligatorios.");
      return;
    }
    if (colors.length === 0 || colors.some((c) => !c.name.trim() || c.views.length === 0)) {
      setError("Cada color necesita un nombre y al menos una vista con foto.");
      return;
    }
    if (colors.some((c) => c.views.some((v) => !v.imageUrl))) {
      setError("Falta subir la foto de alguna vista.");
      return;
    }

    setSaving(true);
    const payload = { name, slug, description, basePrice, active, sizes, materials, colors };
    const res = await fetch(isEdit ? `/api/admin/products/${initial!.id}` : "/api/admin/products", {
      method: isEdit ? "PUT" : "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    setSaving(false);

    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setError(data.error ?? "Error al guardar el producto.");
      return;
    }

    router.push("/admin");
    router.refresh();
  }

  return (
    <form onSubmit={handleSubmit} className="mx-auto max-w-3xl space-y-8 pb-24">
      <section className="space-y-4 rounded-xl border border-neutral-200 bg-white p-6">
        <h2 className="text-lg font-semibold">Información general</h2>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="mb-1 block text-sm font-medium">Nombre</label>
            <input
              value={name}
              onChange={(e) => handleNameChange(e.target.value)}
              className="w-full rounded-md border border-neutral-300 px-3 py-2"
              placeholder="Poleron Oversize Classic"
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium">Slug (URL)</label>
            <input
              value={slug}
              onChange={(e) => {
                setSlugTouched(true);
                setSlug(slugify(e.target.value));
              }}
              className="w-full rounded-md border border-neutral-300 px-3 py-2"
              placeholder="poleron-oversize-classic"
            />
          </div>
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium">Descripción</label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={3}
            className="w-full rounded-md border border-neutral-300 px-3 py-2"
          />
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="mb-1 block text-sm font-medium">Precio base (CLP)</label>
            <input
              type="number"
              value={basePrice}
              onChange={(e) => setBasePrice(Number(e.target.value))}
              className="w-full rounded-md border border-neutral-300 px-3 py-2"
            />
          </div>
          <div className="flex items-center gap-2 pt-6">
            <input
              id="active"
              type="checkbox"
              checked={active}
              onChange={(e) => setActive(e.target.checked)}
            />
            <label htmlFor="active" className="text-sm font-medium">
              Publicado (visible en la tienda)
            </label>
          </div>
        </div>
      </section>

      <section className="space-y-4 rounded-xl border border-neutral-200 bg-white p-6">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold">Tallas</h2>
          <button
            type="button"
            onClick={() => setSizes((s) => [...s, { label: "", priceDelta: 0 }])}
            className="text-sm font-medium text-fuchsia-600 hover:underline"
          >
            + Agregar talla
          </button>
        </div>
        {sizes.map((s, i) => (
          <div key={i} className="flex items-center gap-3">
            <input
              value={s.label}
              onChange={(e) =>
                setSizes((prev) => prev.map((x, j) => (j === i ? { ...x, label: e.target.value } : x)))
              }
              placeholder="M"
              className="w-24 rounded-md border border-neutral-300 px-3 py-2"
            />
            <input
              type="number"
              value={s.priceDelta}
              onChange={(e) =>
                setSizes((prev) =>
                  prev.map((x, j) => (j === i ? { ...x, priceDelta: Number(e.target.value) } : x)),
                )
              }
              placeholder="Recargo CLP"
              className="w-40 rounded-md border border-neutral-300 px-3 py-2"
            />
            <span className="text-sm text-neutral-500">recargo sobre el precio base</span>
            <button
              type="button"
              onClick={() => setSizes((prev) => prev.filter((_, j) => j !== i))}
              className="ml-auto text-sm text-red-600 hover:underline"
            >
              Quitar
            </button>
          </div>
        ))}
      </section>

      <section className="space-y-4 rounded-xl border border-neutral-200 bg-white p-6">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold">Materiales / técnica de impresión</h2>
          <button
            type="button"
            onClick={() => setMaterials((m) => [...m, { label: "", priceDelta: 0 }])}
            className="text-sm font-medium text-fuchsia-600 hover:underline"
          >
            + Agregar material
          </button>
        </div>
        {materials.map((m, i) => (
          <div key={i} className="flex items-center gap-3">
            <input
              value={m.label}
              onChange={(e) =>
                setMaterials((prev) => prev.map((x, j) => (j === i ? { ...x, label: e.target.value } : x)))
              }
              placeholder="DTF"
              className="w-32 rounded-md border border-neutral-300 px-3 py-2"
            />
            <input
              type="number"
              value={m.priceDelta}
              onChange={(e) =>
                setMaterials((prev) =>
                  prev.map((x, j) => (j === i ? { ...x, priceDelta: Number(e.target.value) } : x)),
                )
              }
              placeholder="Recargo CLP"
              className="w-40 rounded-md border border-neutral-300 px-3 py-2"
            />
            <span className="text-sm text-neutral-500">recargo sobre el precio base</span>
            <button
              type="button"
              onClick={() => setMaterials((prev) => prev.filter((_, j) => j !== i))}
              className="ml-auto text-sm text-red-600 hover:underline"
            >
              Quitar
            </button>
          </div>
        ))}
      </section>

      <section className="space-y-6 rounded-xl border border-neutral-200 bg-white p-6">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold">Colores y fotos</h2>
          <button
            type="button"
            onClick={() => setColors((c) => [...c, newColor()])}
            className="text-sm font-medium text-fuchsia-600 hover:underline"
          >
            + Agregar color
          </button>
        </div>

        {colors.map((color, ci) => (
          <div key={ci} className="space-y-4 rounded-lg border border-neutral-200 p-4">
            <div className="flex items-center gap-3">
              <input
                type="color"
                value={color.hex}
                onChange={(e) => updateColor(ci, { hex: e.target.value })}
                className="h-10 w-14 rounded"
              />
              <input
                value={color.name}
                onChange={(e) => updateColor(ci, { name: e.target.value })}
                placeholder="Negro"
                className="flex-1 rounded-md border border-neutral-300 px-3 py-2"
              />
              <button
                type="button"
                onClick={() => setColors((prev) => prev.filter((_, j) => j !== ci))}
                className="text-sm text-red-600 hover:underline"
              >
                Quitar color
              </button>
            </div>

            <div className="space-y-4">
              {color.views.map((view, vi) => {
                const key = `${ci}-${vi}`;
                return (
                  <div key={vi} className="rounded-lg bg-neutral-50 p-4">
                    <div className="mb-3 flex items-center gap-3">
                      <select
                        value={view.label}
                        onChange={(e) => updateView(ci, vi, { label: e.target.value })}
                        className="rounded-md border border-neutral-300 px-3 py-2"
                      >
                        {VIEW_LABEL_OPTIONS.map((opt) => (
                          <option key={opt} value={opt}>
                            {opt}
                          </option>
                        ))}
                      </select>
                      <label className="flex items-center gap-2 text-sm">
                        <input
                          type="checkbox"
                          checked={view.allowRotate}
                          onChange={(e) => updateView(ci, vi, { allowRotate: e.target.checked })}
                        />
                        Permitir rotar el diseño
                      </label>
                      <button
                        type="button"
                        onClick={() =>
                          setColors((prev) =>
                            prev.map((c, j) =>
                              j !== ci ? c : { ...c, views: c.views.filter((_, k) => k !== vi) },
                            ),
                          )
                        }
                        className="ml-auto text-sm text-red-600 hover:underline"
                      >
                        Quitar vista
                      </button>
                    </div>

                    {!view.imageUrl ? (
                      <label className="flex h-40 cursor-pointer items-center justify-center rounded-lg border-2 border-dashed border-neutral-300 text-sm text-neutral-500 hover:border-fuchsia-400">
                        {uploadingKey === key ? "Subiendo..." : "Subir foto del producto"}
                        <input
                          type="file"
                          accept="image/png,image/jpeg,image/webp"
                          className="hidden"
                          onChange={(e) => {
                            const file = e.target.files?.[0];
                            if (file) handleImageUpload(ci, vi, file);
                          }}
                        />
                      </label>
                    ) : (
                      <ZoneEditor
                        imageUrl={view.imageUrl}
                        zone={view}
                        onChange={(zone) => updateView(ci, vi, zone)}
                      />
                    )}
                  </div>
                );
              })}
              <button
                type="button"
                onClick={() =>
                  setColors((prev) =>
                    prev.map((c, j) => (j !== ci ? c : { ...c, views: [...c.views, newView()] })),
                  )
                }
                className="text-sm font-medium text-fuchsia-600 hover:underline"
              >
                + Agregar vista (frente / espalda / manga)
              </button>
            </div>
          </div>
        ))}
      </section>

      {error && <p className="text-sm text-red-600">{error}</p>}

      <div className="fixed inset-x-0 bottom-0 border-t border-neutral-200 bg-white p-4">
        <div className="mx-auto flex max-w-3xl justify-end">
          <button
            type="submit"
            disabled={saving}
            className="rounded-md bg-neutral-900 px-6 py-2.5 font-medium text-white disabled:opacity-50"
          >
            {saving ? "Guardando..." : isEdit ? "Guardar cambios" : "Crear producto"}
          </button>
        </div>
      </div>
    </form>
  );
}
