"use client";

import { useMemo, useState } from "react";
import CollectionGarmentCard from "@/components/CollectionGarmentCard";
import type { GarmentItem, GarmentKind } from "@/components/CollectionGarmentsGrid";

const KIND_LABEL: Record<GarmentKind, string> = { polera: "Polera", poleron: "Polerón oversize", boxy: "Polerón boxifit" };
const KIND_ORDER: GarmentKind[] = ["polera", "poleron", "boxy"];

// Every ready-made garment of every collection, mixed together, with a filter on the side to narrow it down by
// collection (and by type of garment). Nothing selected = everything.
export default function CollectionsBrowser({ items }: { items: GarmentItem[] }) {
  const [collections, setCollections] = useState<Set<string>>(new Set());
  const [kinds, setKinds] = useState<Set<GarmentKind>>(new Set());
  const [open, setOpen] = useState(false);

  const collectionList = useMemo(() => {
    const map = new Map<string, { id: string; name: string; count: number }>();
    for (const i of items) {
      if (!i.collectionId) continue;
      const hit = map.get(i.collectionId);
      if (hit) hit.count++;
      else map.set(i.collectionId, { id: i.collectionId, name: i.collectionName ?? "", count: 1 });
    }
    return [...map.values()];
  }, [items]);
  const kindList = KIND_ORDER.map((k) => ({ kind: k, count: items.filter((i) => i.kind === k).length })).filter((k) => k.count > 0);

  const shown = items.filter((i) => (collections.size === 0 || (i.collectionId && collections.has(i.collectionId))) && (kinds.size === 0 || kinds.has(i.kind)));
  const active = collections.size + kinds.size;

  function toggle<T>(set: Set<T>, value: T, apply: (s: Set<T>) => void) {
    const next = new Set(set);
    if (next.has(value)) next.delete(value);
    else next.add(value);
    apply(next);
  }

  const box = (checked: boolean) => (
    <span
      aria-hidden="true"
      className={`flex h-5 w-5 shrink-0 items-center justify-center rounded border-2 transition ${checked ? "border-neon bg-neon text-black" : "border-neutral-500 text-transparent"}`}
    >
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={3.2} strokeLinecap="round" strokeLinejoin="round" className="h-3.5 w-3.5">
        <path d="M5 12l5 5 9-10" />
      </svg>
    </span>
  );

  return (
    <div className="grid gap-6 lg:grid-cols-[17rem_1fr] lg:gap-10">
      <aside aria-label="Filtros" className="lg:sticky lg:top-28 lg:self-start">
        <button
          type="button"
          onClick={() => setOpen((o) => !o)}
          aria-expanded={open}
          className="flex min-h-12 w-full items-center justify-between rounded-full border-2 border-white/25 px-5 text-sm font-bold uppercase tracking-wide text-white lg:hidden"
        >
          <span>Filtros{active > 0 ? ` (${active})` : ""}</span>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.2} strokeLinecap="round" strokeLinejoin="round" className={`h-4 w-4 transition ${open ? "rotate-180" : ""}`} aria-hidden="true">
            <path d="M6 9l6 6 6-6" />
          </svg>
        </button>

        <div className={`${open ? "block" : "hidden"} mt-4 space-y-6 rounded-2xl border border-white/15 bg-neutral-950 p-5 lg:mt-0 lg:block`}>
          <div className="flex items-center justify-between">
            <h2 className="font-display text-2xl font-bold uppercase leading-none text-white">Filtros</h2>
            {active > 0 && (
              <button
                type="button"
                onClick={() => {
                  setCollections(new Set());
                  setKinds(new Set());
                }}
                className="text-xs font-bold uppercase tracking-wide text-neon hover:underline"
              >
                Limpiar
              </button>
            )}
          </div>

          <fieldset>
            <legend className="mb-2 text-xs font-bold uppercase tracking-[0.18em] text-neutral-400">Colección</legend>
            <ul className="space-y-1">
              {collectionList.map((c) => {
                const checked = collections.has(c.id);
                return (
                  <li key={c.id}>
                    <label className="flex min-h-11 cursor-pointer items-center gap-3 text-base text-white">
                      <input type="checkbox" checked={checked} onChange={() => toggle(collections, c.id, setCollections)} className="peer sr-only" />
                      {box(checked)}
                      <span className="min-w-0 flex-1 peer-focus-visible:underline">{c.name}</span>
                      <span className="text-sm text-neutral-500">({c.count})</span>
                    </label>
                  </li>
                );
              })}
            </ul>
          </fieldset>

          {kindList.length > 1 && (
            <fieldset>
              <legend className="mb-2 text-xs font-bold uppercase tracking-[0.18em] text-neutral-400">Prenda</legend>
              <ul className="space-y-1">
                {kindList.map((k) => {
                  const checked = kinds.has(k.kind);
                  return (
                    <li key={k.kind}>
                      <label className="flex min-h-11 cursor-pointer items-center gap-3 text-base text-white">
                        <input type="checkbox" checked={checked} onChange={() => toggle(kinds, k.kind, setKinds)} className="peer sr-only" />
                        {box(checked)}
                        <span className="min-w-0 flex-1 peer-focus-visible:underline">{KIND_LABEL[k.kind]}</span>
                        <span className="text-sm text-neutral-500">({k.count})</span>
                      </label>
                    </li>
                  );
                })}
              </ul>
            </fieldset>
          )}
        </div>
      </aside>

      <div>
        <p className="mb-4 text-sm text-neutral-400" aria-live="polite">
          {shown.length} {shown.length === 1 ? "prenda" : "prendas"}
        </p>
        {shown.length === 0 ? (
          <p className="py-16 text-center text-neutral-400">No hay prendas con ese filtro. Prueba con otra colección o quita un filtro.</p>
        ) : (
          <ul className="grid grid-cols-2 gap-x-3 gap-y-8 sm:gap-x-5 lg:grid-cols-3 lg:gap-y-10">
            {shown.map((i) => (
              <CollectionGarmentCard
                key={i.key}
                href={i.href}
                blankHref={i.blankHref}
                title={i.title}
                description={i.description}
                badge={i.badge}
                frontArt={i.frontArt}
                backArt={i.backArt}
                frontScale={i.frontScale}
                backScale={i.backScale}
                basePrice={i.basePrice}
                compareAtPrice={i.compareAtPrice}
                colors={i.colors}
              />
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
