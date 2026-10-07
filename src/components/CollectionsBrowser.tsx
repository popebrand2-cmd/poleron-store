"use client";

import { useEffect, useMemo, useState } from "react";
import CollectionGarmentCard from "@/components/CollectionGarmentCard";
import type { GarmentItem, GarmentKind } from "@/components/CollectionGarmentsGrid";

const KIND_LABEL: Record<GarmentKind, string> = { polera: "Polera", poleron: "Polerón oversize", boxy: "Polerón boxifit" };
const KIND_ORDER: GarmentKind[] = ["polera", "poleron", "boxy"];
const DESIGNS_SHOWN = 6;
type Sort = "mix" | "price-asc" | "price-desc" | "az";

const norm = (s: string) =>
  s
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "");

// Every ready-made garment of every collection, mixed, with filters that stay short however many designs there are:
// a search box, the collections as chips, the designs of the chosen collections (the first few, "ver todos" for the rest),
// the garment type and the order. On phones the filters open as a sheet from the bottom.
export default function CollectionsBrowser({ items }: { items: GarmentItem[] }) {
  const [query, setQuery] = useState("");
  const [groups, setGroups] = useState<Set<string>>(new Set());
  const [designs, setDesigns] = useState<Set<string>>(new Set());
  const [kinds, setKinds] = useState<Set<GarmentKind>>(new Set());
  const [sort, setSort] = useState<Sort>("mix");
  const [allDesigns, setAllDesigns] = useState(false);
  const [sheet, setSheet] = useState(false);

  const groupList = useMemo(() => {
    const map = new Map<string, { id: string; name: string; count: number }>();
    for (const i of items) {
      const id = i.groupId ?? "";
      if (!id) continue;
      const hit = map.get(id);
      if (hit) hit.count++;
      else map.set(id, { id, name: i.groupName ?? "", count: 1 });
    }
    return [...map.values()];
  }, [items]);

  const designList = useMemo(() => {
    const map = new Map<string, { id: string; name: string; group: string; count: number }>();
    for (const i of items) {
      if (!i.collectionId) continue;
      if (groups.size > 0 && !groups.has(i.groupId ?? "")) continue;
      const hit = map.get(i.collectionId);
      if (hit) hit.count++;
      else map.set(i.collectionId, { id: i.collectionId, name: i.collectionName ?? "", group: i.groupName ?? "", count: 1 });
    }
    return [...map.values()];
  }, [items, groups]);

  // Designs picked in a collection that is no longer selected don't keep filtering out of sight.
  useEffect(() => {
    setDesigns((prev) => {
      const visible = new Set(designList.map((d) => d.id));
      const next = new Set([...prev].filter((id) => visible.has(id)));
      return next.size === prev.size ? prev : next;
    });
  }, [designList]);

  const kindList = KIND_ORDER.map((k) => ({ kind: k, count: items.filter((i) => i.kind === k).length })).filter((k) => k.count > 0);

  const q = norm(query.trim());
  const shown = useMemo(() => {
    const list = items.filter(
      (i) =>
        (groups.size === 0 || groups.has(i.groupId ?? "")) &&
        (designs.size === 0 || designs.has(i.collectionId ?? "")) &&
        (kinds.size === 0 || kinds.has(i.kind)) &&
        (!q || norm(`${i.title} ${i.collectionName ?? ""} ${i.groupName ?? ""}`).includes(q)),
    );
    if (sort === "price-asc") return [...list].sort((a, b) => (a.basePrice ?? 0) - (b.basePrice ?? 0));
    if (sort === "price-desc") return [...list].sort((a, b) => (b.basePrice ?? 0) - (a.basePrice ?? 0));
    if (sort === "az") return [...list].sort((a, b) => a.title.localeCompare(b.title, "es"));
    return list;
  }, [items, groups, designs, kinds, q, sort]);

  const designMatches = q ? designList.filter((d) => norm(d.name).includes(q)) : designList;
  const designsVisible = allDesigns || q ? designMatches : designMatches.slice(0, DESIGNS_SHOWN);

  const active: { key: string; label: string; clear: () => void }[] = [
    ...(q ? [{ key: "q", label: `«${query.trim()}»`, clear: () => setQuery("") }] : []),
    ...groupList.filter((g) => groups.has(g.id)).map((g) => ({ key: `g-${g.id}`, label: g.name, clear: () => toggle(groups, g.id, setGroups) })),
    ...designList.filter((d) => designs.has(d.id)).map((d) => ({ key: `d-${d.id}`, label: d.name, clear: () => toggle(designs, d.id, setDesigns) })),
    ...kindList.filter((k) => kinds.has(k.kind)).map((k) => ({ key: `k-${k.kind}`, label: KIND_LABEL[k.kind], clear: () => toggle(kinds, k.kind, setKinds) })),
  ];

  function toggle<T>(set: Set<T>, value: T, apply: (s: Set<T>) => void) {
    const next = new Set(set);
    if (next.has(value)) next.delete(value);
    else next.add(value);
    apply(next);
  }
  function clearAll() {
    setQuery("");
    setGroups(new Set());
    setDesigns(new Set());
    setKinds(new Set());
  }

  useEffect(() => {
    if (!sheet) return;
    const prev = document.documentElement.style.overflow;
    document.documentElement.style.overflow = "hidden";
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setSheet(false);
    window.addEventListener("keydown", onKey);
    return () => {
      document.documentElement.style.overflow = prev;
      window.removeEventListener("keydown", onKey);
    };
  }, [sheet]);

  const chip = (on: boolean) =>
    `inline-flex min-h-9 items-center gap-1.5 rounded-full border px-3.5 text-xs font-bold uppercase tracking-wide transition ${
      on ? "border-neon bg-neon text-black" : "border-white/20 text-white/80 hover:border-white/60 hover:text-white"
    }`;
  const label = "mb-2.5 text-[11px] font-bold uppercase tracking-[0.22em] text-white/45";

  const filters = (
    <div className="space-y-6">
      <div className="relative">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-white/40" aria-hidden="true">
          <circle cx="11" cy="11" r="7" />
          <path d="m20 20-3.5-3.5" />
        </svg>
        <input
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Buscar diseño o prenda"
          aria-label="Buscar diseño o prenda"
          className="h-11 w-full rounded-full border border-white/15 bg-white/[0.04] pl-10 pr-4 text-sm text-white placeholder:text-white/35 focus:border-neon focus:outline-none"
        />
      </div>

      {groupList.length > 1 && (
        <fieldset>
          <legend className={label}>Colección</legend>
          <div className="flex flex-wrap gap-2">
            {groupList.map((g) => (
              <button key={g.id} type="button" aria-pressed={groups.has(g.id)} onClick={() => toggle(groups, g.id, setGroups)} className={chip(groups.has(g.id))}>
                {g.name}
                <span className={groups.has(g.id) ? "text-black/60" : "text-white/35"}>{g.count}</span>
              </button>
            ))}
          </div>
        </fieldset>
      )}

      {designList.length > 1 && (
        <fieldset>
          <legend className={label}>
            Diseño <span className="normal-case tracking-normal text-white/30">· {designMatches.length}</span>
          </legend>
          <ul className="space-y-0.5">
            {designsVisible.map((d) => {
              const on = designs.has(d.id);
              return (
                <li key={d.id}>
                  <button type="button" aria-pressed={on} onClick={() => toggle(designs, d.id, setDesigns)} className={`flex min-h-10 w-full items-center gap-3 rounded-lg px-2 text-left text-sm transition ${on ? "bg-neon/10 text-white" : "text-white/75 hover:bg-white/5 hover:text-white"}`}>
                    <span aria-hidden="true" className={`grid h-4 w-4 shrink-0 place-items-center rounded border ${on ? "border-neon bg-neon text-black" : "border-white/30"}`}>
                      {on && (
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={3.5} className="h-3 w-3">
                          <path d="M5 12l5 5 9-10" />
                        </svg>
                      )}
                    </span>
                    <span className="min-w-0 flex-1 truncate">{d.name}</span>
                    <span className="text-xs text-white/30">{d.count}</span>
                  </button>
                </li>
              );
            })}
          </ul>
          {designMatches.length === 0 && <p className="px-2 text-sm text-white/40">Ningún diseño con ese nombre.</p>}
          {!q && designMatches.length > DESIGNS_SHOWN && (
            <button type="button" onClick={() => setAllDesigns((v) => !v)} className="mt-2 px-2 text-xs font-bold uppercase tracking-wide text-neon hover:underline">
              {allDesigns ? "Ver menos" : `Ver los ${designMatches.length} diseños`}
            </button>
          )}
        </fieldset>
      )}

      {kindList.length > 1 && (
        <fieldset>
          <legend className={label}>Prenda</legend>
          <div className="flex flex-wrap gap-2">
            {kindList.map((k) => (
              <button key={k.kind} type="button" aria-pressed={kinds.has(k.kind)} onClick={() => toggle(kinds, k.kind, setKinds)} className={chip(kinds.has(k.kind))}>
                {KIND_LABEL[k.kind]}
              </button>
            ))}
          </div>
        </fieldset>
      )}
    </div>
  );

  return (
    <div className="grid gap-6 lg:grid-cols-[16.5rem_1fr] lg:gap-10">
      {/* Desktop: a sticky side panel that scrolls on its own if it gets long */}
      <aside aria-label="Filtros" className="hidden lg:sticky lg:top-28 lg:block lg:max-h-[calc(100vh-8rem)] lg:self-start lg:overflow-y-auto lg:pb-20 lg:pr-1 [scrollbar-width:thin]">
        <div className="mb-5 flex items-center justify-between">
          <h2 className="font-display text-2xl font-bold uppercase leading-none text-white">Filtros</h2>
          {active.length > 0 && (
            <button type="button" onClick={clearAll} className="text-xs font-bold uppercase tracking-wide text-neon hover:underline">
              Limpiar
            </button>
          )}
        </div>
        {filters}
      </aside>

      <div className="min-w-0">
        <div className="mb-4 flex flex-wrap items-center gap-3">
          <button
            type="button"
            onClick={() => setSheet(true)}
            className="inline-flex min-h-11 items-center gap-2 rounded-full border border-white/25 px-5 text-xs font-bold uppercase tracking-wide text-white lg:hidden"
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" className="h-4 w-4" aria-hidden="true">
              <path d="M4 6h16M7 12h10M10 18h4" />
            </svg>
            Filtros{active.length > 0 ? ` (${active.length})` : ""}
          </button>
          <p className="text-sm text-white/50" aria-live="polite">
            {shown.length} {shown.length === 1 ? "prenda" : "prendas"}
          </p>
          <label className="ml-auto flex items-center gap-2 text-xs text-white/50">
            <span className="hidden sm:inline">Ordenar</span>
            <select value={sort} onChange={(e) => setSort(e.target.value as Sort)} className="h-10 rounded-full border border-white/20 bg-black px-3 text-xs font-bold uppercase tracking-wide text-white focus:border-neon focus:outline-none">
              <option value="mix">Destacados</option>
              <option value="price-asc">Menor precio</option>
              <option value="price-desc">Mayor precio</option>
              <option value="az">A-Z</option>
            </select>
          </label>
        </div>

        {active.length > 0 && (
          <div className="mb-5 flex flex-wrap items-center gap-2">
            {active.map((a) => (
              <button key={a.key} type="button" onClick={a.clear} className="inline-flex min-h-8 items-center gap-1.5 rounded-full bg-white/10 px-3 text-xs font-semibold text-white transition hover:bg-white/20">
                {a.label}
                <span aria-hidden="true" className="text-white/50">✕</span>
                <span className="sr-only">Quitar filtro</span>
              </button>
            ))}
            <button type="button" onClick={clearAll} className="px-2 text-xs font-bold uppercase tracking-wide text-neon hover:underline">
              Limpiar todo
            </button>
          </div>
        )}

        {shown.length === 0 ? (
          <p className="py-16 text-center text-white/50">No hay prendas con esos filtros. Prueba con otra colección o quita un filtro.</p>
        ) : (
          <ul className="grid grid-cols-2 gap-x-3 gap-y-8 sm:gap-x-5 lg:grid-cols-3 lg:gap-y-10">
            {shown.map((i, n) => (
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
                className="pope-card-in"
                style={{ animationDelay: `${Math.min(n, 8) * 45}ms` }}
              />
            ))}
          </ul>
        )}
      </div>

      {/* Phone: the filters as a sheet from the bottom */}
      {sheet && (
        <div role="dialog" aria-modal="true" aria-label="Filtros" className="fixed inset-0 z-[80] lg:hidden">
          <button type="button" aria-label="Cerrar filtros" tabIndex={-1} onClick={() => setSheet(false)} className="pope-excl-backdrop absolute inset-0 bg-black/70" />
          <div className="pope-sheet absolute inset-x-0 bottom-0 flex max-h-[85vh] flex-col rounded-t-3xl border-t border-white/15 bg-neutral-950">
            <div className="flex items-center justify-between px-5 pb-3 pt-4">
              <h2 className="font-display text-2xl font-bold uppercase leading-none text-white">Filtros</h2>
              <button type="button" onClick={() => setSheet(false)} aria-label="Cerrar" className="grid h-10 w-10 place-items-center rounded-full text-2xl text-white">
                ×
              </button>
            </div>
            <div className="flex-1 overflow-y-auto px-5 pb-4">{filters}</div>
            <div className="flex gap-3 border-t border-white/10 px-5 py-3 pb-[max(0.75rem,env(safe-area-inset-bottom))]">
              <button type="button" onClick={clearAll} className="min-h-12 rounded-full border border-white/25 px-5 text-xs font-bold uppercase tracking-wide text-white">
                Limpiar
              </button>
              <button type="button" onClick={() => setSheet(false)} className="min-h-12 flex-1 rounded-full bg-neon px-5 text-xs font-bold uppercase tracking-wide text-black">
                Ver {shown.length} {shown.length === 1 ? "prenda" : "prendas"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
