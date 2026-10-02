"use client";

import { useRef, useState } from "react";
import Link from "next/link";
import Txt from "@/components/edit/Txt";
import EditableText from "@/components/edit/EditableText";
import { useEditMode } from "@/components/edit/EditModeContext";
import { useReviews, type ReviewRow } from "@/components/edit/useReviews";
import { uploadSiteImage } from "@/lib/site-edit-client";
import { DragHandle, DeleteItemButton, AddItemButton } from "@/components/edit/EditItemControls";

function Star({ filled }: { filled: boolean }) {
  return (
    <svg viewBox="0 0 20 20" className={`h-4 w-4 ${filled ? "fill-amber-400" : "fill-neutral-700"}`}>
      <path d="M10 1.5l2.6 5.4 5.9.7-4.3 4.2 1 5.9L10 14.9l-5.2 2.8 1-5.9-4.3-4.2 5.9-.7z" />
    </svg>
  );
}

function StarRow({ rating, onChange }: { rating: number; onChange?: (n: number) => void }) {
  return (
    <div className="flex items-center gap-0.5">
      {[1, 2, 3, 4, 5].map((n) =>
        onChange ? (
          <button key={n} type="button" onClick={() => onChange(n)} aria-label={`${n} estrellas`}>
            <Star filled={n <= rating} />
          </button>
        ) : (
          <Star key={n} filled={n <= rating} />
        ),
      )}
    </div>
  );
}

function fmtDate(iso: string) {
  try {
    return new Date(iso).toLocaleDateString("es-CL", { day: "2-digit", month: "short", year: "numeric" });
  } catch {
    return "";
  }
}

type ProductRef = { slug: string; name: string; imageUrl: string };

function Card({
  review,
  products,
  editMode,
  onUpdate,
  onDelete,
  dragProps,
  delay,
}: {
  review: ReviewRow;
  products: ProductRef[];
  editMode: boolean;
  onUpdate: (fields: Partial<ReviewRow>) => void;
  onDelete: () => void;
  dragProps?: React.HTMLAttributes<HTMLDivElement>;
  delay: number;
}) {
  const fileInput = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const product = products.find((p) => p.slug === review.productSlug);

  async function replacePhoto(file: File) {
    setBusy(true);
    try {
      const url = await uploadSiteImage(file);
      onUpdate({ photoUrl: url });
    } finally {
      setBusy(false);
    }
  }

  return (
    <div
      {...dragProps}
      className="pope-rise glass glass-hover relative flex flex-col gap-3 overflow-hidden rounded-2xl border border-white/10 p-4"
      style={{ animationDelay: `${delay}s` }}
    >
      <svg viewBox="0 0 32 32" aria-hidden="true" className="pointer-events-none absolute -right-1 -top-1 h-14 w-14 fill-white/[0.04]">
        <path d="M10.5 6C6.4 8 4 11.8 4 16.4c0 4 2.4 6.6 5.7 6.6 2.6 0 4.5-1.9 4.5-4.4 0-2.3-1.6-4-3.7-4-.4 0-.8 0-1.1.1.4-2.8 2.6-5.3 5.2-6.6L10.5 6zm13.5 0c-4.1 2-6.5 5.8-6.5 10.4 0 4 2.4 6.6 5.7 6.6 2.6 0 4.5-1.9 4.5-4.4 0-2.3-1.6-4-3.7-4-.4 0-.8 0-1.1.1.4-2.8 2.6-5.3 5.2-6.6L24 6z" />
      </svg>
      <div className="flex items-start gap-3">
        <span className="relative h-11 w-11 shrink-0 overflow-hidden rounded-full bg-neutral-800">
          {review.photoUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={review.photoUrl} alt="" className="h-full w-full object-cover" />
          ) : (
            <span className="flex h-full w-full items-center justify-center text-sm font-bold text-neutral-400">
              {(review.customerName || "?").trim().charAt(0).toUpperCase()}
            </span>
          )}
        </span>
        <div className="min-w-0 flex-1">
          <p className="flex items-center gap-1.5 truncate text-sm font-bold text-white">
            <EditableText value={review.customerName} onSave={(v) => onUpdate({ customerName: v })} as="span" placeholder="Nombre" />
            {review.verified && (
              <svg viewBox="0 0 20 20" className="h-3.5 w-3.5 shrink-0 fill-neon" aria-label="Compra verificada">
                <path d="M10 1l2.1 1.2 2.4-.3 1.1 2.2 2.2 1.1-.3 2.4L18.7 10l-1.2 2.1.3 2.4-2.2 1.1-1.1 2.2-2.4-.3L10 19l-2.1-1.2-2.4.3-1.1-2.2-2.2-1.1.3-2.4L1.3 10l1.2-2.1-.3-2.4 2.2-1.1 1.1-2.2 2.4.3z" />
                <path d="M7.2 10.2l1.9 1.9 3.7-3.9" stroke="black" strokeWidth={1.4} fill="none" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            )}
          </p>
          <p className="text-[11px] text-neutral-500">{fmtDate(review.reviewDate)}</p>
        </div>
        {editMode && (
          <div className="flex shrink-0 items-center gap-1">
            <DragHandle />
            <DeleteItemButton onDelete={onDelete} />
          </div>
        )}
      </div>

      <StarRow rating={review.rating} onChange={editMode ? (n) => onUpdate({ rating: n }) : undefined} />

      <p className="text-sm leading-relaxed text-neutral-300">
        <EditableText value={review.text} onSave={(v) => onUpdate({ text: v })} as="span" multiline allowEmpty placeholder="Escribe la reseña real del cliente…" />
      </p>

      {editMode && (
        <div className="flex flex-wrap items-center gap-2 border-t border-white/10 pt-3 text-[11px]">
          <button type="button" disabled={busy} onClick={() => fileInput.current?.click()} className="rounded-full border border-white/15 px-2.5 py-1 font-semibold text-neutral-300 hover:text-white">
            {busy ? "Subiendo…" : review.photoUrl ? "Cambiar foto" : "Subir foto"}
          </button>
          {review.photoUrl && (
            <button type="button" onClick={() => onUpdate({ photoUrl: "" })} className="text-neutral-500 underline hover:text-white">
              Quitar foto
            </button>
          )}
          <input
            ref={fileInput}
            type="file"
            accept="image/png,image/jpeg,image/webp"
            className="hidden"
            onChange={(e) => {
              const file = e.target.files?.[0];
              e.target.value = "";
              if (file) replacePhoto(file);
            }}
          />
          <label className="flex items-center gap-1 text-neutral-400">
            <input type="checkbox" checked={review.verified} onChange={(e) => onUpdate({ verified: e.target.checked })} className="h-3.5 w-3.5 accent-[var(--neon)]" />
            Verificada
          </label>
          <select
            value={review.productSlug}
            onChange={(e) => onUpdate({ productSlug: e.target.value })}
            className="rounded border border-neutral-700 bg-black px-1.5 py-1 text-neutral-300"
          >
            <option value="">Sin prenda vinculada</option>
            {products.map((p) => (
              <option key={p.slug} value={p.slug}>
                {p.name}
              </option>
            ))}
          </select>
        </div>
      )}

      {!editMode && product && (
        <Link href={`/productos/${product.slug}`} className="mt-1 flex items-center gap-2 rounded-xl border border-white/10 bg-white/5 p-2 transition hover:bg-white/10">
          {product.imageUrl && (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={product.imageUrl} alt="" className="h-9 w-9 shrink-0 rounded-lg object-cover" />
          )}
          <span className="truncate text-xs font-semibold text-neutral-300">{product.name}</span>
        </Link>
      )}
    </div>
  );
}

// Real customer reviews, shown as a star-rated grid. Nothing is invented here: each card is a
// review the owner typed in from a real customer (edit mode → this section), optionally with the
// customer's own photo and a link to the real product they bought. Hidden from visitors until at
// least one real review exists — same rule as RealWorks/RealVideos.
export default function ReviewsSection({ initialItems, products }: { initialItems: ReviewRow[]; products: ProductRef[] }) {
  const { editMode } = useEditMode();
  const { items, addItem, updateItem, removeItem, moveItem } = useReviews(initialItems);
  const dragIndex = useRef<number | null>(null);

  if (items.length === 0 && !editMode) return null;

  if (items.length === 0 && editMode) {
    return (
      <section className="border-t border-neutral-800 bg-neutral-950">
        <div className="mx-auto max-w-6xl px-6 py-10 text-center">
          <p className="text-sm text-neutral-400">
            Aquí aparecerán tus reseñas reales. Agrega las que ya tengas (WhatsApp, Instagram, Mercado Libre) con «Agregar
            reseña». Mientras no agregues ninguna, esta sección no se muestra a los visitantes.
          </p>
          <div className="mt-4">
            <AddItemButton onAdd={addItem} label="Agregar reseña" />
          </div>
        </div>
      </section>
    );
  }

  const avg = items.reduce((s, r) => s + r.rating, 0) / items.length;

  return (
    <section className="border-t border-neutral-800 bg-neutral-950">
      <div className="mx-auto max-w-6xl px-6 py-16">
        <div className="pope-rise mb-10 text-center">
          <Txt k="reviews.eyebrow" as="p" className="mb-1 block font-script text-3xl text-neon" />
          <Txt k="reviews.heading" as="h2" className="block text-4xl font-bold uppercase text-white sm:text-5xl" />
          <div className="mt-3 flex items-center justify-center gap-2">
            <StarRow rating={Math.round(avg)} />
            <span className="text-sm font-semibold text-neutral-300">
              {avg.toFixed(1)} · {items.length} {items.length === 1 ? "reseña" : "reseñas"}
            </span>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {items.map((review, i) => {
            return (
              <Card
                key={review.id}
                review={review}
                products={products}
                editMode={editMode}
                onUpdate={(fields) => updateItem(review.id, fields)}
                onDelete={() => removeItem(review.id)}
                delay={Math.min(i * 0.08, 0.4)}
                dragProps={
                  editMode
                    ? {
                        draggable: true,
                        onDragStart: () => {
                          dragIndex.current = i;
                        },
                        onDragOver: (e) => e.preventDefault(),
                        onDrop: (e) => {
                          e.preventDefault();
                          if (dragIndex.current !== null) moveItem(dragIndex.current, i);
                          dragIndex.current = null;
                        },
                      }
                    : undefined
                }
              />
            );
          })}
        </div>

        {editMode && (
          <div className="mt-6 text-center">
            <AddItemButton onAdd={addItem} label="Agregar reseña" />
          </div>
        )}
      </div>
    </section>
  );
}
