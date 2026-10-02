"use client";

import { useMemo, useRef, useState } from "react";
import Link from "next/link";
import CollectionGarmentsGrid, { type GarmentItem } from "@/components/CollectionGarmentsGrid";
import { kindDescription, type StudioGarment } from "@/lib/garments";
import { removeColorBackground } from "@/lib/remove-color-bg";
import { segmentSubject, preloadSubjectSegmenter } from "@/lib/segment-subject";
import { cornerColor, enhanceImage, imageSize } from "@/lib/studio-image";

type Art = { blob: Blob; url: string; w: number; h: number };
type CollectionOption = { id: string; name: string; slug: string; category: string; photoUrl: string };

const CHECKER = {
  backgroundImage: "linear-gradient(45deg,#2a2a2a 25%,transparent 25%),linear-gradient(-45deg,#2a2a2a 25%,transparent 25%),linear-gradient(45deg,transparent 75%,#2a2a2a 75%),linear-gradient(-45deg,transparent 75%,#2a2a2a 75%)",
  backgroundSize: "16px 16px",
  backgroundPosition: "0 0,0 8px,8px -8px,-8px 0",
  backgroundColor: "#171717",
};

const slugify = (s: string) =>
  s
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");

async function toArt(blob: Blob): Promise<Art> {
  const url = URL.createObjectURL(blob);
  const { w, h } = await imageSize(url);
  return { blob, url, w, h };
}

function useArt() {
  const [art, setArt] = useState<Art | null>(null);
  const [history, setHistory] = useState<Art[]>([]);
  return {
    art,
    canUndo: history.length > 0,
    load: (a: Art) => {
      setArt(a);
      setHistory([]);
    },
    apply: (a: Art) => {
      if (art) setHistory((h) => [...h, art]);
      setArt(a);
    },
    undo: () => {
      const prev = history[history.length - 1];
      if (!prev) return;
      setArt(prev);
      setHistory(history.slice(0, -1));
    },
    clear: () => {
      setArt(null);
      setHistory([]);
    },
  };
}
type ArtState = ReturnType<typeof useArt>;

function ArtSlot({ title, hint, slot }: { title: string; hint: string; slot: ArtState }) {
  const { art } = slot;
  const input = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState("");
  const [error, setError] = useState("");
  const [tolerance, setTolerance] = useState(45);

  async function run(label: string, job: () => Promise<Blob>) {
    setBusy(label);
    setError("");
    try {
      slot.apply(await toArt(await job()));
    } catch (e) {
      setError(e instanceof Error ? e.message : "No se pudo procesar la imagen.");
    } finally {
      setBusy("");
    }
  }

  async function pick(file: File) {
    if (!/^image\/(png|jpeg|webp)$/.test(file.type)) {
      setError("Usa una imagen PNG, JPG o WEBP.");
      return;
    }
    setError("");
    slot.load(await toArt(file));
  }

  const btn = "rounded-full border border-white/20 px-3 py-1.5 text-xs font-semibold text-white transition hover:border-neon hover:text-neon disabled:opacity-40";

  return (
    <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4">
      <div className="mb-3 flex items-baseline justify-between gap-2">
        <h3 className="text-sm font-bold uppercase tracking-wide text-white">{title}</h3>
        <span className="text-[11px] text-neutral-400">{hint}</span>
      </div>

      <div
        className="relative flex h-56 items-center justify-center overflow-hidden rounded-xl"
        style={CHECKER}
        onDragOver={(e) => e.preventDefault()}
        onDrop={(e) => {
          e.preventDefault();
          const f = e.dataTransfer.files?.[0];
          if (f) pick(f);
        }}
      >
        {art ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={art.url} alt={title} className="max-h-full max-w-full object-contain" />
        ) : (
          <button type="button" onClick={() => input.current?.click()} className="px-6 text-center text-sm text-neutral-400 hover:text-white">
            Arrastra la imagen aquí o haz clic para subirla
          </button>
        )}
        {busy && <div className="absolute inset-0 flex items-center justify-center bg-black/70 text-sm font-semibold text-white">{busy}…</div>}
      </div>
      <input
        ref={input}
        type="file"
        accept="image/png,image/jpeg,image/webp"
        className="hidden"
        onChange={(e) => {
          const f = e.target.files?.[0];
          e.target.value = "";
          if (f) pick(f);
        }}
      />

      {art && (
        <>
          <p className="mt-2 text-[11px] text-neutral-400">
            {art.w}×{art.h} px {Math.max(art.w, art.h) < 1200 ? "· resolución baja: usa «Mejorar calidad»" : ""}
          </p>
          <div className="mt-3 flex flex-wrap items-center gap-2">
            <button
              type="button"
              disabled={!!busy}
              className={btn}
              onClick={() =>
                run("Quitando fondo", async () => {
                  const c = await cornerColor(art.url);
                  if (c.transparent) throw new Error("Esta imagen ya tiene el fondo transparente.");
                  return removeColorBackground(art.url, { r: c.r, g: c.g, b: c.b }, tolerance);
                })
              }
            >
              Quitar fondo liso
            </button>
            <label className="flex items-center gap-1.5 text-[11px] text-neutral-400">
              Sensibilidad
              <input type="range" min={10} max={110} value={tolerance} onChange={(e) => setTolerance(Number(e.target.value))} className="w-24 accent-[var(--neon)]" />
            </label>
          </div>
          <div className="mt-2 flex flex-wrap items-center gap-2">
            <button type="button" disabled={!!busy} className={btn} onMouseEnter={preloadSubjectSegmenter} onClick={() => run("Quitando fondo con IA (puede tardar la primera vez)", () => segmentSubject(art.url))}>
              Quitar fondo (IA)
            </button>
            <button type="button" disabled={!!busy} className={btn} onClick={() => run("Mejorando calidad", () => enhanceImage(art.url))}>
              Mejorar calidad
            </button>
            <button type="button" disabled={!!busy || !slot.canUndo} className={btn} onClick={slot.undo}>
              Deshacer
            </button>
            <button type="button" disabled={!!busy} className="text-xs text-neutral-400 underline hover:text-white" onClick={slot.clear}>
              Quitar imagen
            </button>
          </div>
          <p className="mt-2 text-[11px] leading-snug text-neutral-500">
            «Fondo liso» sirve para diseños de ChatGPT sobre un color parejo (blanco, negro…). «IA» es para fotos o fondos con detalle.
          </p>
        </>
      )}
      {error && <p className="mt-2 text-xs text-red-400">{error}</p>}
    </div>
  );
}

export default function DesignStudio({ garments, collections, sections }: { garments: StudioGarment[]; collections: CollectionOption[]; sections: string[] }) {
  const frontSlot = useArt();
  const backSlot = useArt();
  const front = frontSlot.art;
  const back = backSlot.art;
  const [frontScale, setFrontScale] = useState(0.6);
  const [backScale, setBackScale] = useState(1);

  const [collectionId, setCollectionId] = useState(collections[0]?.id ?? "new");
  const [newName, setNewName] = useState("");
  const [category, setCategory] = useState("");
  const [designName, setDesignName] = useState("");
  const [photo, setPhoto] = useState<{ file: File; url: string } | null>(null);
  const photoInput = useRef<HTMLInputElement>(null);
  const [publishing, setPublishing] = useState(false);
  const [error, setError] = useState("");
  const [done, setDone] = useState<{ slug: string; name: string } | null>(null);

  const items: GarmentItem[] = useMemo(
    () =>
      garments.map((g) => ({
        key: g.id,
        kind: g.kind,
        href: "#",
        title: `${g.name} ${designName || "tu diseño"}`,
        description: g.description || kindDescription(g.kind),
        badge: g.badgeText || undefined,
        frontArt: front?.url ?? "",
        backArt: back?.url ?? "",
        frontScale,
        backScale,
        basePrice: g.basePrice,
        compareAtPrice: g.compareAtPrice,
        colors: g.colors,
      })),
    [garments, front, back, frontScale, backScale, designName],
  );

  async function upload(art: Art): Promise<string> {
    const res = await fetch("/api/upload", { method: "POST", headers: { "Content-Type": art.blob.type || "image/png" }, body: art.blob });
    const data = await res.json();
    if (!res.ok || !data.url) throw new Error(data.error ?? "No se pudo subir la imagen.");
    return data.url as string;
  }

  async function publish() {
    setError("");
    const name = designName.trim();
    if (!front && !back) return setError("Sube al menos una imagen (frente o espalda).");
    if (!name) return setError("Ponle un nombre al diseño.");
    if (collectionId === "new" && !newName.trim()) return setError("Escribe el nombre de la colección nueva.");
    setPublishing(true);
    try {
      let colId = collectionId;
      let slug = collections.find((c) => c.id === collectionId)?.slug ?? "";
      let colName = collections.find((c) => c.id === collectionId)?.name ?? "";
      if (collectionId === "new") {
        colName = newName.trim();
        const base = slugify(colName) || "coleccion";
        let created: { id?: string; error?: string } = {};
        for (let n = 0; n < 5; n++) {
          slug = n === 0 ? base : `${base}-${n + 1}`;
          const res = await fetch("/api/admin/collections", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ name: colName, slug, active: true, category: category.trim() }),
          });
          created = await res.json();
          if (res.ok && created.id) break;
          if (res.status !== 409) throw new Error(created.error ?? "No se pudo crear la colección.");
        }
        if (!created.id) throw new Error("No se pudo crear la colección.");
        colId = created.id;
      }
      if (photo) {
        const up = await fetch("/api/upload", { method: "POST", headers: { "Content-Type": photo.file.type }, body: photo.file });
        const upData = await up.json();
        if (!up.ok || !upData.url) throw new Error(upData.error ?? "No se pudo subir la foto del artista.");
        await fetch(`/api/admin/collections/${colId}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ photoUrl: upData.url }),
        });
      }
      const frontUrl = front ? await upload(front) : "";
      const backUrl = back ? await upload(back) : "";
      const res = await fetch(`/api/admin/collections/${colId}/designs`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          imageUrl: frontUrl || backUrl,
          placement: frontUrl ? "FRONT" : "BACK",
          backImageUrl: frontUrl && backUrl ? backUrl : "",
          showFront: !!frontUrl,
          showBack: !!backUrl,
          frontScale,
          backScale,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "No se pudo guardar el diseño.");
      setDone({ slug, name: colName });
    } catch (e) {
      setError(e instanceof Error ? e.message : "No se pudo publicar.");
    } finally {
      setPublishing(false);
    }
  }

  function reset() {
    frontSlot.clear();
    backSlot.clear();
    setDesignName("");
    setPhoto(null);
    setDone(null);
  }

  const field = "w-full rounded-lg border border-neutral-700 bg-black px-3 py-2 text-sm text-white focus:border-neon focus:outline-none";

  return (
    <div className="grid gap-8 lg:grid-cols-[minmax(0,26rem)_minmax(0,1fr)]">
      <div className="space-y-5">
        <ArtSlot title="Frente" hint="Logo o texto del pecho" slot={frontSlot} />
        <ArtSlot title="Espalda" hint="Ilustración grande" slot={backSlot} />

        <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4">
          <h3 className="mb-3 text-sm font-bold uppercase tracking-wide text-white">Tamaño en la prenda</h3>
          <label className="mb-3 block text-xs text-neutral-300">
            Frente: {Math.round(frontScale * 100)}%
            <input type="range" min={20} max={120} value={Math.round(frontScale * 100)} onChange={(e) => setFrontScale(Number(e.target.value) / 100)} className="mt-1 block w-full accent-[var(--neon)]" />
          </label>
          <label className="block text-xs text-neutral-300">
            Espalda: {Math.round(backScale * 100)}%
            <input type="range" min={20} max={120} value={Math.round(backScale * 100)} onChange={(e) => setBackScale(Number(e.target.value) / 100)} className="mt-1 block w-full accent-[var(--neon)]" />
          </label>
        </div>

        <div className="rounded-2xl border border-neon/40 bg-white/[0.03] p-4">
          <h3 className="mb-3 text-sm font-bold uppercase tracking-wide text-neon">Publicar en una colección</h3>
          {done ? (
            <div className="space-y-3 text-sm text-white">
              <p>
                Listo: el diseño ya está en <strong>{done.name}</strong>.
              </p>
              <div className="flex flex-wrap gap-3">
                <Link href={`/artistas/${done.slug}`} target="_blank" className="rounded-full bg-neon px-4 py-2 text-xs font-bold uppercase text-black">
                  Ver la colección
                </Link>
                <button type="button" onClick={reset} className="rounded-full border border-white/25 px-4 py-2 text-xs font-bold uppercase text-white hover:border-neon">
                  Subir otro diseño
                </button>
              </div>
            </div>
          ) : (
            <div className="space-y-3">
              <label className="block text-xs font-semibold text-neutral-300">
                Colección
                <select value={collectionId} onChange={(e) => setCollectionId(e.target.value)} className={`${field} mt-1`}>
                  {collections.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                  <option value="new">+ Colección nueva…</option>
                </select>
              </label>
              {collectionId === "new" && (
                <>
                  <label className="block text-xs font-semibold text-neutral-300">
                    Nombre de la colección (artista o anime)
                    <input value={newName} onChange={(e) => setNewName(e.target.value)} placeholder="Ej: Feid" className={`${field} mt-1`} />
                  </label>
                  <label className="block text-xs font-semibold text-neutral-300">
                    Sección en la portada
                    <input list="studio-sections" value={category} onChange={(e) => setCategory(e.target.value)} placeholder="Artistas, Anime…" className={`${field} mt-1`} />
                    <datalist id="studio-sections">
                      {sections.map((s) => (
                        <option key={s} value={s} />
                      ))}
                    </datalist>
                  </label>
                </>
              )}
              <div className="text-xs font-semibold text-neutral-300">
                Foto del artista {collections.find((c) => c.id === collectionId)?.photoUrl ? "(ya tiene; sube otra solo para cambiarla)" : "(opcional)"}
                <div className="mt-1 flex items-center gap-3">
                  {photo && (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={photo.url} alt="Foto del artista" className="h-16 w-12 rounded-md object-cover" />
                  )}
                  <button type="button" onClick={() => photoInput.current?.click()} className="rounded-full border border-white/25 px-3 py-1.5 text-xs font-semibold text-white hover:border-neon hover:text-neon">
                    {photo ? "Cambiar foto" : "Subir foto"}
                  </button>
                  {photo && (
                    <button type="button" onClick={() => setPhoto(null)} className="text-xs font-normal text-neutral-400 underline">
                      Quitar
                    </button>
                  )}
                </div>
                <input
                  ref={photoInput}
                  type="file"
                  accept="image/png,image/jpeg,image/webp"
                  className="hidden"
                  onChange={(e) => {
                    const f = e.target.files?.[0];
                    e.target.value = "";
                    if (f) setPhoto({ file: f, url: URL.createObjectURL(f) });
                  }}
                />
              </div>
              <label className="block text-xs font-semibold text-neutral-300">
                Nombre del diseño
                <input value={designName} onChange={(e) => setDesignName(e.target.value)} placeholder="Ej: No me arrepiento de sentir tanto" className={`${field} mt-1`} />
              </label>
              {error && <p className="text-xs text-red-400">{error}</p>}
              <button type="button" disabled={publishing} onClick={publish} className="w-full rounded-full bg-neon px-4 py-3 text-sm font-bold uppercase tracking-wide text-black disabled:opacity-50">
                {publishing ? "Publicando…" : "Publicar diseño"}
              </button>
              <p className="text-[11px] leading-snug text-neutral-500">
                Se agrega a la colección y aparece al instante en su página, en todas las prendas y colores que tienen foto de frente y espalda.
              </p>
            </div>
          )}
        </div>
      </div>

      <div>
        <h2 className="mb-1 text-lg font-bold uppercase text-white">Vista previa en tus prendas</h2>
        <p className="mb-5 text-sm text-neutral-400">Así se verá en la colección, por delante y por detrás. Cambia de color con los puntos.</p>
        {garments.length === 0 ? (
          <p className="rounded-xl border border-dashed border-white/20 p-6 text-sm text-neutral-400">
            Todavía no hay productos con fotos de frente y espalda. Súbelas en Productos para ver aquí tus prendas.
          </p>
        ) : !front && !back ? (
          <p className="rounded-xl border border-dashed border-white/20 p-6 text-sm text-neutral-400">Sube una imagen a la izquierda y aparecerá puesta en cada prenda.</p>
        ) : (
          <div
            onClickCapture={(e) => {
              if ((e.target as HTMLElement).closest("a")) e.preventDefault();
            }}
          >
            <CollectionGarmentsGrid items={items} />
          </div>
        )}
      </div>
    </div>
  );
}
