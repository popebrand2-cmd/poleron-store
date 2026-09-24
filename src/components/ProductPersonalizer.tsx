"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { v4 as uuidv4 } from "uuid";
import MockupEditor, { type MockupEditorHandle, type MockupView, type PresetPosition } from "./MockupEditor";
import TryOnEditor from "./TryOnEditor";
import ProductInfo, { VatNote } from "./ProductInfo";
import { useCartStore } from "@/lib/cart-store";
import { formatCLP } from "@/lib/money";
import { trackEvent } from "@/lib/track";
import type { DesignPlacementMap } from "@/types";

export type PersonalizerProduct = {
  id: string;
  slug: string;
  name: string;
  basePrice: number;
  sizes: {
    label: string;
    priceDelta: number;
    chestCm?: number | null;
    lengthCm?: number | null;
    sleeveCm?: number | null;
  }[];
  materials: { label: string; priceDelta: number }[];
  colors: { name: string; hex: string; views: MockupView[] }[];
};

// The cart keeps a snapshot of the mockup. A full-size PNG of a photo is several hundred KB, which
// fills the browser's localStorage quickly, so it is stored as a compact JPEG instead.
async function compactSnapshot(dataUrl: string): Promise<string> {
  try {
    const img = new Image();
    await new Promise<void>((resolve, reject) => {
      img.onload = () => resolve();
      img.onerror = () => reject(new Error("snapshot"));
      img.src = dataUrl;
    });
    const canvas = document.createElement("canvas");
    canvas.width = img.naturalWidth;
    canvas.height = img.naturalHeight;
    const ctx = canvas.getContext("2d");
    if (!ctx) return dataUrl;
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(img, 0, 0);
    return canvas.toDataURL("image/jpeg", 0.85);
  } catch {
    return dataUrl;
  }
}

function StepTitle({ title, hint }: { title: string; hint?: string }) {
  return (
    <div className="mb-3">
      <div>
        <h2 className="font-display text-3xl font-bold uppercase leading-none text-black">{title}</h2>
        {hint && <p className="mt-0.5 text-xs text-neutral-500">{hint}</p>}
      </div>
    </div>
  );
}

export default function ProductPersonalizer({ product }: { product: PersonalizerProduct }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const addItem = useCartStore((s) => s.addItem);
  const removeItem = useCartStore((s) => s.removeItem);

  const [colorIndex, setColorIndex] = useState(0);
  const [sizeIndex, setSizeIndex] = useState(0);
  const [materialIndex, setMaterialIndex] = useState(0);
  const color = product.colors[colorIndex];
  const [activeViewLabel, setActiveViewLabel] = useState(color.views[0]?.label ?? "");
  // A view's MockupEditor only mounts once its tab has actually been shown.
  // Mounting it eagerly while hidden (display:none) meant its canvas
  // measured a container width of 0 and fell back to a fixed pixel width —
  // fine on desktop, but on a narrow phone that fixed width overflowed its
  // (overflow-hidden) container the moment the tab became visible, showing
  // only a cropped slice of the garment instead of the whole photo.
  const [activatedViews, setActivatedViews] = useState<Set<string>>(
    () => new Set(color.views[0] ? [color.views[0].label] : []),
  );

  // Editing a design that is already in the cart (?editar=<id>): restore its color, size and
  // placement, and replace that cart line when the customer confirms again.
  const [editing, setEditing] = useState<{ id: string; quantity: number; placement: DesignPlacementMap } | null>(null);
  const [editorNonce, setEditorNonce] = useState(0);

  const editorRefs = useRef<Record<string, MockupEditorHandle | null>>({});
  // Guards against a rapid double-click adding the item twice: `adding`
  // (React state) only disables the button after a re-render, which is too
  // late for two clicks fired in the same tick — this ref blocks re-entry
  // synchronously, before React even sees the second click.
  const addingRef = useRef(false);
  const [adding, setAdding] = useState(false);
  const [formError, setFormError] = useState("");
  const [tryOnSnapshot, setTryOnSnapshot] = useState<string | null>(null);

  type PresetDesign = { id: string; name: string; imageUrl: string; placement: "FRONT" | "BACK" };
  type PresetCollection = { id: string; name: string; designs: PresetDesign[] };
  const [collections, setCollections] = useState<PresetCollection[]>([]);
  const [presetFront, setPresetFront] = useState<{ url: string; position: PresetPosition } | null>(null);

  useEffect(() => {
    fetch("/api/collections")
      .then((res) => res.json())
      .then((data) => setCollections(data.collections ?? []))
      .catch(() => setCollections([]));
  }, []);

  const size = product.sizes[sizeIndex];
  const material = product.materials[materialIndex];
  const unitPrice = product.basePrice + (size?.priceDelta ?? 0) + (material?.priceDelta ?? 0);

  // --- Measurement: only moments that really happen -------------------------------------------
  const viewedRef = useRef(false);
  const customizedRef = useRef(false);
  useEffect(() => {
    if (viewedRef.current) return;
    viewedRef.current = true;
    trackEvent("ViewContent", {
      content_type: "product",
      content_ids: [product.id],
      content_name: product.name,
      value: product.basePrice,
      currency: "CLP",
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function handleDesignAdded() {
    if (customizedRef.current) return;
    customizedRef.current = true;
    trackEvent("CustomizeProduct", { content_ids: [product.id], content_name: product.name });
  }

  // --- Restore a cart line for editing ---------------------------------------------------------
  const editId = searchParams.get("editar");
  useEffect(() => {
    if (!editId) return;
    const item = useCartStore.getState().items.find((i) => i.id === editId && i.productId === product.id);
    if (!item) return;
    const ci = Math.max(0, product.colors.findIndex((c) => c.name === item.colorName));
    const si = Math.max(0, product.sizes.findIndex((s) => s.label === item.sizeLabel));
    const mi = Math.max(0, product.materials.findIndex((m) => m.label === item.materialLabel));
    const targetColor = product.colors[ci];
    const firstWithDesign = targetColor.views.find((v) => item.designPlacement[v.label])?.label ?? targetColor.views[0]?.label ?? "";
    setColorIndex(ci);
    setSizeIndex(si);
    setMaterialIndex(mi);
    setActiveViewLabel(firstWithDesign);
    // mount every view that has a design so all of them are restored (and re-saved) together
    setActivatedViews(new Set(targetColor.views.filter((v) => item.designPlacement[v.label]).map((v) => v.label).concat(firstWithDesign)));
    setEditing({ id: item.id, quantity: item.quantity, placement: item.designPlacement });
    setEditorNonce((n) => n + 1);
    customizedRef.current = true;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [editId]);

  // Arriving from an artist catalog (?diseno=<id>): once the editor canvas is ready, drop that
  // ready-made design onto the garment (front designs go to the Frente view, back ones to Espalda).
  const presetId = searchParams.get("diseno");
  const presetAppliedRef = useRef(false);
  useEffect(() => {
    if (!presetId || presetAppliedRef.current || editId || collections.length === 0) return;
    const design = collections.flatMap((c) => c.designs).find((d) => d.id === presetId);
    if (!design) return;
    const label = design.placement === "BACK" ? "Espalda" : "Frente";
    if (!color.views.some((v) => v.label === label)) return;
    if (activeViewLabel !== label) {
      handleViewChange(label);
      return;
    }
    let tries = 0;
    const timer = setInterval(() => {
      tries++;
      if (editorRefs.current[label]?.applyPresetDesign(design.imageUrl, design.placement === "BACK" ? "back" : "center")) {
        presetAppliedRef.current = true;
        if (design.placement === "FRONT") setPresetFront({ url: design.imageUrl, position: "center" });
        clearInterval(timer);
      } else if (tries > 40) clearInterval(timer);
    }, 250);
    return () => clearInterval(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [presetId, collections, activeViewLabel]);

  const activePlacement = activeViewLabel === "Frente" ? "FRONT" : activeViewLabel === "Espalda" ? "BACK" : null;
  const collectionsForView = collections
    .map((c) => ({ ...c, designs: c.designs.filter((d) => d.placement === activePlacement) }))
    .filter((c) => c.designs.length > 0);

  function applyPresetDesign(design: PresetDesign, position: PresetPosition | "back") {
    editorRefs.current[activeViewLabel]?.applyPresetDesign(design.imageUrl, position);
    if (design.placement === "FRONT" && position !== "back") {
      setPresetFront({ url: design.imageUrl, position });
    }
  }

  function handleColorChange(index: number) {
    setColorIndex(index);
    editorRefs.current = {};
    const firstLabel = product.colors[index].views[0]?.label ?? "";
    setActiveViewLabel(firstLabel);
    setActivatedViews(new Set(firstLabel ? [firstLabel] : []));
    setTryOnSnapshot(null);
    setPresetFront(null);
    setEditing((e) => (e ? { ...e, placement: {} } : e));
  }

  function handleViewChange(label: string) {
    setActiveViewLabel(label);
    setActivatedViews((prev) => (prev.has(label) ? prev : new Set(prev).add(label)));
    setPresetFront(null);
  }

  function handleTryOn() {
    const snapshot = editorRefs.current[activeViewLabel]?.getSnapshot();
    if (snapshot) setTryOnSnapshot(snapshot);
  }

  async function handleAddToCart() {
    if (addingRef.current) return;
    addingRef.current = true;
    setFormError("");
    setAdding(true);
    try {
      for (const view of color.views) {
        if (editorRefs.current[view.label]?.hasWhiteOnWhiteRisk()) {
          setFormError(
            `Tu diseño en "${view.label}" tiene fondo blanco sobre un polerón blanco: la estampa no se vería. Quita el fondo blanco antes de continuar.`,
          );
          document.getElementById("paso-2")?.scrollIntoView({ behavior: "smooth", block: "start" });
          return;
        }
      }

      const placement: DesignPlacementMap = {};
      let previewImageUrl: string | null = null;

      for (const view of color.views) {
        const handle = editorRefs.current[view.label];
        const p = await handle?.getPlacement();
        if (p) {
          placement[view.label] = p;
          if (!previewImageUrl || view.label === "Frente") {
            previewImageUrl = handle!.getSnapshot();
          }
        }
      }

      if (Object.keys(placement).length === 0) {
        setFormError("Sube al menos un diseño (frente, espalda o manga) antes de agregar al carrito.");
        document.getElementById("paso-2")?.scrollIntoView({ behavior: "smooth", block: "start" });
        return;
      }

      const preview = previewImageUrl ? await compactSnapshot(previewImageUrl) : "";
      const quantity = editing?.quantity ?? 1;
      if (editing) removeItem(editing.id);
      addItem({
        id: uuidv4(),
        productId: product.id,
        productSlug: product.slug,
        productName: product.name,
        colorName: color.name,
        colorHex: color.hex,
        sizeLabel: size?.label ?? "",
        materialLabel: material?.label ?? "",
        unitPrice,
        quantity,
        previewImageUrl: preview,
        designPlacement: placement,
      });
      trackEvent("AddToCart", {
        content_type: "product",
        content_ids: [product.id],
        content_name: product.name,
        value: unitPrice * quantity,
        currency: "CLP",
      });
      router.push("/carrito");
    } catch (e) {
      // A plain Error we (or MockupEditor's getPlacement) threw on purpose is already in Spanish
      // and safe to show; anything else (a native browser exception) gets a generic fallback
      // instead of leaking raw, English error text to the customer.
      setFormError(
        e instanceof Error && e.name === "Error" && e.message
          ? e.message
          : "No se pudo agregar al carrito. Revisa tu conexión e intenta de nuevo.",
      );
    } finally {
      addingRef.current = false;
      setAdding(false);
    }
  }

  const hasMeasurements = product.sizes.some((s) => s.chestCm || s.lengthCm || s.sleeveCm);

  return (
    <div className="grid min-w-0 grid-cols-1 gap-8 pb-28 lg:grid-cols-2 lg:gap-x-10 lg:pb-0">
      {/* Header + the three stages */}
      <header className="lg:col-span-2">
        <h1 className="font-display text-5xl font-bold uppercase leading-[0.9] text-black sm:text-6xl">{product.name}</h1>
        <p className="mt-1 text-2xl font-semibold text-black" aria-live="polite">
          {formatCLP(unitPrice)}
        </p>
        <VatNote />
        {editing && (
          <p className="mt-3 rounded-lg border border-neutral-300 bg-neutral-50 px-3 py-2 text-sm text-neutral-700">
            Estás editando un producto de tu carrito. Al confirmar, reemplaza al anterior.
          </p>
        )}
      </header>

      {/* 01 — ELIGE */}
      <section id="paso-1" className="scroll-mt-28 lg:col-start-2 lg:row-start-2">
        <StepTitle title="Elige" hint="Color, talla y técnica" />

        <div>
          <p className="mb-2 text-sm font-medium">Color: {color.name}</p>
          <div className="flex flex-wrap gap-3">
            {product.colors.map((c, i) => (
              <button
                key={c.name}
                type="button"
                onClick={() => handleColorChange(i)}
                aria-label={`Color ${c.name}`}
                aria-pressed={i === colorIndex}
                className={`h-11 w-11 rounded-full border-2 ${i === colorIndex ? "border-neon ring-2 ring-black" : "border-neutral-300"}`}
                style={{ backgroundColor: c.hex }}
                title={c.name}
              />
            ))}
          </div>
        </div>

        <div className="mt-5">
          <p className="mb-2 text-sm font-medium">Talla: {size?.label}</p>
          <div className="flex flex-wrap gap-2">
            {product.sizes.map((s, i) => (
              <button
                key={s.label}
                type="button"
                onClick={() => setSizeIndex(i)}
                aria-pressed={i === sizeIndex}
                className={`min-h-11 min-w-11 rounded-md border px-4 py-2 text-sm font-medium ${
                  i === sizeIndex ? "border-neutral-900 bg-neutral-900 text-white" : "border-neutral-300"
                }`}
              >
                {s.label}
              </button>
            ))}
          </div>

          {hasMeasurements && (
            <details className="group mt-3">
              <summary className="flex w-fit cursor-pointer select-none list-none items-center gap-2 rounded-full border-2 border-black bg-white px-4 py-1.5 text-xs font-bold uppercase tracking-wide text-black transition hover:border-neon hover:bg-neon [&::-webkit-details-marker]:hidden">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4">
                  <path d="M4 9h16v6H4z" />
                  <path d="M8 9v2.5M12 9v3.5M16 9v2.5" />
                </svg>
                Guía de tallas
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.2} strokeLinecap="round" strokeLinejoin="round" className="h-3.5 w-3.5 transition group-open:rotate-180">
                  <path d="M6 9l6 6 6-6" />
                </svg>
              </summary>
              <div className="mt-2 overflow-x-auto rounded-lg border border-neutral-200 px-3 pb-3 pt-2">
                <table className="w-full text-left text-sm">
                  <thead className="text-xs uppercase text-neutral-500">
                    <tr>
                      <th className="py-1 pr-3 font-semibold">Talla</th>
                      <th className="py-1 pr-3 font-semibold">Pecho</th>
                      <th className="py-1 pr-3 font-semibold">Largo</th>
                      <th className="py-1 font-semibold">Manga</th>
                    </tr>
                  </thead>
                  <tbody>
                    {product.sizes.map((s) => (
                      <tr key={s.label} className={s.label === size?.label ? "bg-neon/30 font-semibold" : ""}>
                        <td className="py-1 pr-3">{s.label}</td>
                        <td className="py-1 pr-3">{s.chestCm ?? "—"}</td>
                        <td className="py-1 pr-3">{s.lengthCm ?? "—"}</td>
                        <td className="py-1">{s.sleeveCm ?? "—"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </details>
          )}
        </div>

        {product.materials.length > 0 && (
          <div className="mt-5">
            <p className="mb-2 text-sm font-medium">Material</p>
            <div className="flex flex-wrap gap-2">
              {product.materials.map((m, i) => (
                <button
                  key={m.label}
                  type="button"
                  onClick={() => setMaterialIndex(i)}
                  aria-pressed={i === materialIndex}
                  className={`min-h-11 rounded-md border px-4 py-2 text-sm font-medium ${
                    i === materialIndex ? "border-neutral-900 bg-neutral-900 text-white" : "border-neutral-300"
                  }`}
                >
                  {m.label}
                </button>
              ))}
            </div>
          </div>
        )}
      </section>

      {/* 02 — PERSONALIZA */}
      <section id="paso-2" className="min-w-0 scroll-mt-28 lg:col-start-1 lg:row-span-2 lg:row-start-2">
        <StepTitle title="Personaliza" hint="Sube tu diseño, muévelo y mira cómo queda" />

        <div className="mb-4 flex justify-center gap-2 rounded-lg bg-neutral-100 p-1">
          {color.views.map((v) => (
            <button
              key={v.label}
              type="button"
              onClick={() => handleViewChange(v.label)}
              className={`min-h-11 flex-1 rounded-md px-3 py-1.5 text-sm font-medium ${
                activeViewLabel === v.label ? "bg-white shadow" : "text-neutral-500"
              }`}
            >
              {v.label}
            </button>
          ))}
        </div>

        <div key={`${color.name}-${editorNonce}`} className="relative">
          {color.views.map((v) => (
            <div key={v.label} style={{ display: activeViewLabel === v.label ? "block" : "none" }}>
              {activatedViews.has(v.label) && (
                <MockupEditor
                  view={v}
                  sizes={product.sizes}
                  selectedSizeLabel={size?.label ?? ""}
                  colorHex={color.hex}
                  initialPlacement={editing?.placement[v.label] ?? null}
                  onDesignAdded={handleDesignAdded}
                  ref={(handle) => {
                    editorRefs.current[v.label] = handle;
                  }}
                />
              )}
            </div>
          ))}
        </div>

        {collectionsForView.length > 0 && (
          <div className="relative mt-6 overflow-hidden rounded-2xl bg-black p-4 text-white sm:p-5">
            <div
              aria-hidden="true"
              className="pointer-events-none absolute inset-0"
              style={{ background: "radial-gradient(70% 60% at 85% 0%, color-mix(in srgb, var(--neon) 24%, transparent), transparent 70%)" }}
            />
            <div className="relative">
              <p className="text-[11px] font-bold uppercase tracking-[0.3em] text-neon">POPE · Colecciones</p>
              <h3 className="mt-1 font-display text-3xl font-bold uppercase leading-none sm:text-4xl">O elige de nuestra colección</h3>
              <p className="mt-2 text-sm text-neutral-400">Toca un diseño y aparece en tu prenda.</p>

              <div className="mt-5 space-y-6">
                {collectionsForView.map((c) => (
                  <div key={c.id}>
                    <p className="mb-2.5 flex items-center gap-3 font-display text-2xl font-bold uppercase leading-none">
                      <span className="h-0.5 w-6 bg-neon" aria-hidden="true" />
                      {c.name}
                    </p>
                    <div className="scrollbar-none -mx-4 flex snap-x gap-3 overflow-x-auto px-4 pb-1 sm:mx-0 sm:flex-wrap sm:overflow-visible sm:px-0" style={{ scrollbarWidth: "none" }}>
                      {c.designs.map((d) => {
                        const selected = presetFront?.url === d.imageUrl;
                        return (
                          <button
                            key={d.id}
                            type="button"
                            onClick={() => applyPresetDesign(d, activePlacement === "BACK" ? "back" : "center")}
                            aria-pressed={selected}
                            title={d.name}
                            className="group w-24 shrink-0 snap-start text-left sm:w-28"
                          >
                            <span
                              className={`relative block aspect-[3/4] overflow-hidden rounded-xl border-2 bg-neutral-200 transition ${
                                selected ? "border-neon shadow-[0_0_22px_color-mix(in_srgb,var(--neon)_45%,transparent)]" : "border-neutral-700 group-hover:border-neon"
                              }`}
                            >
                              {/* eslint-disable-next-line @next/next/no-img-element */}
                              <img src={d.imageUrl} alt={d.name} className="h-full w-full object-cover object-top transition duration-300 group-hover:scale-105" />
                              {selected && (
                                <span className="absolute right-1.5 top-1.5 flex h-6 w-6 items-center justify-center rounded-full bg-neon text-black" aria-hidden="true">
                                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={3} strokeLinecap="round" strokeLinejoin="round" className="h-3.5 w-3.5">
                                    <path d="M5 12.5l4.5 4.5L19 7.5" />
                                  </svg>
                                </span>
                              )}
                            </span>
                            {d.name.toLowerCase() !== c.name.toLowerCase() && (
                              <span className="mt-1.5 block truncate text-xs font-semibold uppercase tracking-wide text-neutral-300">{d.name}</span>
                            )}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>

              {presetFront && (
                <div className="mt-6 border-t border-neutral-800 pt-4">
                  <p className="mb-2 text-[11px] font-bold uppercase tracking-[0.2em] text-neon">Posición en el pecho</p>
                  <div className="flex flex-wrap gap-2">
                    {(["left", "center", "right"] as const).map((pos) => (
                      <button
                        key={pos}
                        type="button"
                        onClick={() => {
                          const design = collectionsForView
                            .flatMap((c) => c.designs)
                            .find((d) => d.imageUrl === presetFront.url);
                          if (design) applyPresetDesign(design, pos);
                        }}
                        aria-pressed={presetFront.position === pos}
                        className={`min-h-11 rounded-full border-2 px-5 py-1.5 text-xs font-bold uppercase tracking-wide transition ${
                          presetFront.position === pos
                            ? "border-neon bg-neon text-black"
                            : "border-neutral-600 text-white hover:border-neon"
                        }`}
                      >
                        {pos === "left" ? "Izquierda" : pos === "center" ? "Centro" : "Derecha"}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </section>

      {/* 03 — CONFIRMA */}
      <section id="paso-3" className="scroll-mt-28 lg:col-start-2 lg:row-start-3">
        {formError && (
          <p role="alert" className="mt-4 text-sm text-red-600">
            {formError}
          </p>
        )}

        <button
          type="button"
          onClick={handleAddToCart}
          disabled={adding}
          className="mt-5 hidden min-h-12 w-full rounded-full bg-neon px-6 py-3 text-sm font-bold uppercase tracking-wide text-black transition hover:brightness-90 disabled:opacity-50 lg:block"
        >
          {adding ? "Agregando..." : editing ? "Guardar cambios" : "Agregar al carrito"}
        </button>

        <button
          type="button"
          onClick={handleTryOn}
          className="mt-3 min-h-11 w-full rounded-full border-2 border-black px-6 py-2.5 text-xs font-bold uppercase tracking-wide text-black transition hover:bg-neon"
        >
          ¿Cómo se vería puesto?
        </button>

        <ProductInfo />
      </section>

      {tryOnSnapshot && (
        <div className="min-w-0 lg:col-span-2">
          <TryOnEditor garmentSnapshotUrl={tryOnSnapshot} onClose={() => setTryOnSnapshot(null)} />
        </div>
      )}

      {/* Phone: price and the main button are always in reach */}
      <div className="fixed inset-x-0 bottom-0 z-40 border-t-2 border-neon bg-black px-4 py-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] lg:hidden">
        <div className="mx-auto flex max-w-md items-center gap-3">
          <div className="leading-none">
            <p className="text-[11px] uppercase tracking-wide text-neutral-400">Total</p>
            <p className="font-display text-4xl font-bold text-neon" aria-live="polite">
              {formatCLP(unitPrice)}
            </p>
          </div>
          <button
            type="button"
            onClick={handleAddToCart}
            disabled={adding}
            className="min-h-12 flex-1 rounded-full bg-neon px-4 py-2.5 text-sm font-bold uppercase tracking-wide text-black transition active:brightness-90 disabled:opacity-50"
          >
            {adding ? "Agregando..." : editing ? "Guardar cambios" : "Agregar al carrito"}
          </button>
        </div>
      </div>
    </div>
  );
}
