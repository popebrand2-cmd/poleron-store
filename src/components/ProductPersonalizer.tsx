"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { v4 as uuidv4 } from "uuid";
import MockupEditor, { type MockupEditorHandle, type MockupView } from "./MockupEditor";
import TryOnEditor from "./TryOnEditor";
import { useCartStore } from "@/lib/cart-store";
import { formatCLP } from "@/lib/money";
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

export default function ProductPersonalizer({ product }: { product: PersonalizerProduct }) {
  const router = useRouter();
  const addItem = useCartStore((s) => s.addItem);

  const [colorIndex, setColorIndex] = useState(0);
  const [sizeIndex, setSizeIndex] = useState(0);
  const [materialIndex, setMaterialIndex] = useState(0);
  const color = product.colors[colorIndex];
  const [activeViewLabel, setActiveViewLabel] = useState(color.views[0]?.label ?? "");

  const editorRefs = useRef<Record<string, MockupEditorHandle | null>>({});
  // Guards against a rapid double-click adding the item twice: `adding`
  // (React state) only disables the button after a re-render, which is too
  // late for two clicks fired in the same tick — this ref blocks re-entry
  // synchronously, before React even sees the second click.
  const addingRef = useRef(false);
  const [adding, setAdding] = useState(false);
  const [formError, setFormError] = useState("");
  const [tryOnSnapshot, setTryOnSnapshot] = useState<string | null>(null);

  const size = product.sizes[sizeIndex];
  const material = product.materials[materialIndex];
  const unitPrice = product.basePrice + (size?.priceDelta ?? 0) + (material?.priceDelta ?? 0);

  function handleColorChange(index: number) {
    setColorIndex(index);
    editorRefs.current = {};
    setActiveViewLabel(product.colors[index].views[0]?.label ?? "");
    setTryOnSnapshot(null);
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
        return;
      }

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
        quantity: 1,
        previewImageUrl: previewImageUrl ?? "",
        designPlacement: placement,
      });
      router.push("/carrito");
    } finally {
      addingRef.current = false;
      setAdding(false);
    }
  }

  return (
    <div className="grid grid-cols-1 gap-10 lg:grid-cols-2">
      <div>
        <div className="mb-4 flex justify-center gap-2 rounded-lg bg-neutral-100 p-1">
          {color.views.map((v) => (
            <button
              key={v.label}
              type="button"
              onClick={() => setActiveViewLabel(v.label)}
              className={`rounded-md px-3 py-1.5 text-sm font-medium ${
                activeViewLabel === v.label ? "bg-white shadow" : "text-neutral-500"
              }`}
            >
              {v.label}
            </button>
          ))}
        </div>

        <div key={color.name} className="relative">
          {color.views.map((v) => (
            <div key={v.label} style={{ display: activeViewLabel === v.label ? "block" : "none" }}>
              <MockupEditor
                view={v}
                sizes={product.sizes}
                selectedSizeLabel={size?.label ?? ""}
                ref={(handle) => {
                  editorRefs.current[v.label] = handle;
                }}
              />
            </div>
          ))}
        </div>
      </div>

      <div>
        <h1 className="text-2xl font-bold">{product.name}</h1>
        <p className="mt-1 text-xl font-medium">{formatCLP(unitPrice)}</p>

        <div className="mt-6">
          <p className="mb-2 text-sm font-medium">Color: {color.name}</p>
          <div className="flex gap-2">
            {product.colors.map((c, i) => (
              <button
                key={c.name}
                type="button"
                onClick={() => handleColorChange(i)}
                className={`h-9 w-9 rounded-full border-2 ${
                  i === colorIndex ? "border-fuchsia-500" : "border-neutral-300"
                }`}
                style={{ backgroundColor: c.hex }}
                title={c.name}
              />
            ))}
          </div>
        </div>

        <div className="mt-6">
          <p className="mb-2 text-sm font-medium">Material</p>
          <div className="flex flex-wrap gap-2">
            {product.materials.map((m, i) => (
              <button
                key={m.label}
                type="button"
                onClick={() => setMaterialIndex(i)}
                className={`rounded-md border px-4 py-2 text-sm font-medium ${
                  i === materialIndex ? "border-neutral-900 bg-neutral-900 text-white" : "border-neutral-300"
                }`}
              >
                {m.label}
              </button>
            ))}
          </div>
        </div>

        <div className="mt-6">
          <p className="mb-2 text-sm font-medium">Talla</p>
          <div className="flex flex-wrap gap-2">
            {product.sizes.map((s, i) => (
              <button
                key={s.label}
                type="button"
                onClick={() => setSizeIndex(i)}
                className={`rounded-md border px-4 py-2 text-sm font-medium ${
                  i === sizeIndex ? "border-neutral-900 bg-neutral-900 text-white" : "border-neutral-300"
                }`}
              >
                {s.label}
              </button>
            ))}
          </div>
        </div>

        {formError && <p className="mt-4 text-sm text-red-600">{formError}</p>}

        <button
          type="button"
          onClick={handleAddToCart}
          disabled={adding}
          className="mt-8 w-full rounded-md bg-neutral-900 px-6 py-3 font-medium text-white disabled:opacity-50"
        >
          {adding ? "Agregando..." : "Agregar al carrito"}
        </button>

        <button
          type="button"
          onClick={handleTryOn}
          className="mt-3 w-full rounded-md border border-neutral-300 px-6 py-3 text-sm font-medium text-neutral-700 hover:bg-neutral-50"
        >
          ¿Cómo se vería puesto?
        </button>
      </div>

      {tryOnSnapshot && (
        <div className="lg:col-span-2">
          <TryOnEditor garmentSnapshotUrl={tryOnSnapshot} onClose={() => setTryOnSnapshot(null)} />
        </div>
      )}
    </div>
  );
}
