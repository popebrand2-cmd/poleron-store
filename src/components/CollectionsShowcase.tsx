"use client";

import { useEffect, useMemo, useRef, useState, type CSSProperties, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import EditableLink from "@/components/edit/EditableLink";
import { useEditMode } from "@/components/edit/EditModeContext";
import { DEFAULT_SECTIONS } from "@/lib/collection-sections";

export type ShowcaseArtist = { id: string; slug: string; name: string; imageUrl: string; count: number; category: string };

const NO_SECTION = "Otros";
const ALL = "Todas";

type Mode = "desktop" | "tablet" | "mobile";
type St = { x: number; s: number; o: number; d: number; z: number; r: number };

// Stack geometry by distance from the centre (x in card widths). Values between two steps are
// interpolated, so dragging moves the cards live instead of jumping.
const STATES: Record<Mode, St[]> = {
  desktop: [
    { x: 0, s: 1, o: 1, d: 0, z: 80, r: 0 },
    { x: 0.55, s: 0.89, o: 0.84, d: 0.28, z: -40, r: 3 },
    { x: 0.96, s: 0.78, o: 0.54, d: 0.5, z: -130, r: 6 },
    { x: 1.24, s: 0.68, o: 0, d: 0.68, z: -220, r: 8 },
  ],
  tablet: [
    { x: 0, s: 1, o: 1, d: 0, z: 80, r: 0 },
    { x: 0.6, s: 0.89, o: 0.84, d: 0.28, z: -40, r: 3 },
    { x: 1.0, s: 0.78, o: 0, d: 0.5, z: -130, r: 6 },
    { x: 1.24, s: 0.68, o: 0, d: 0.68, z: -220, r: 8 },
  ],
  mobile: [
    { x: 0, s: 1, o: 1, d: 0, z: 40, r: 0 },
    { x: 0.2, s: 0.9, o: 0.85, d: 0.36, z: -40, r: 0 },
    { x: 0.3, s: 0.8, o: 0, d: 0.5, z: -130, r: 0 },
    { x: 0.4, s: 0.7, o: 0, d: 0.68, z: -220, r: 0 },
  ],
};
const COLLAPSED: St = { x: 0, s: 0.8, o: 0, d: 0.6, z: -150, r: 0 };

function stateAt(S: St[], a: number): St {
  if (a >= 3) return S[3];
  const i = Math.floor(a);
  const t = a - i;
  const A = S[i];
  const B = S[i + 1];
  return { x: A.x + (B.x - A.x) * t, s: A.s + (B.s - A.s) * t, o: A.o + (B.o - A.o) * t, d: A.d + (B.d - A.d) * t, z: A.z + (B.z - A.z) * t, r: A.r + (B.r - A.r) * t };
}

const pad = (n: number) => String(n).padStart(2, "0");
const designsLabel = (n: number) => `${n} ${n === 1 ? "diseño" : "diseños"}`;

export default function CollectionsShowcase({
  artists,
  eyebrow,
  heading,
  ctaLabel,
}: {
  artists: ShowcaseArtist[];
  eyebrow: ReactNode;
  heading: ReactNode;
  ctaLabel: ReactNode;
}) {
  const router = useRouter();
  const { editMode } = useEditMode();
  const [cat, setCat] = useState(ALL);
  const [query, setQuery] = useState("");
  const [searchOpen, setSearchOpen] = useState(false);
  const [active, setActive] = useState(0);
  const [dragU, setDragU] = useState(0);
  const [dragging, setDragging] = useState(false);
  const [swapping, setSwapping] = useState(false);
  const [mode, setMode] = useState<Mode>("desktop");
  const [reduce, setReduce] = useState(false);
  // Which list the cards were last "dealt" for: while it differs from the current one, the new cards
  // render stacked at the centre for a frame, then fan out one after another.
  const [dealtFor, setDealtFor] = useState("|");
  const [stagger, setStagger] = useState(false);
  const stageRef = useRef<HTMLDivElement>(null);
  const chipsRef = useRef<HTMLElement>(null);
  const searchRef = useRef<HTMLInputElement>(null);
  const swapTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const sx = useRef<number | null>(null);
  const moved = useRef(false);
  const dragRef = useRef(false);
  const dragVal = useRef(0);
  const unit = useRef(160);
  const wheelLock = useRef(0);
  const firstDeal = useRef(true);
  const [giant, setGiant] = useState<{ cur?: string; prev?: string; k: number }>({ k: 0 });

  // The default sections always show (even while empty), then any other section used in the admin,
  // then "Todas". Artists without a section fall under "Otros".
  const sections = useMemo(() => [...new Set([...DEFAULT_SECTIONS, ...artists.map((a) => a.category || NO_SECTION)])], [artists]);
  const filters = [...sections, ALL];
  const items = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (q) return artists.filter((a) => a.name.toLowerCase().includes(q));
    if (cat === ALL) return artists;
    return artists.filter((a) => (a.category || NO_SECTION) === cat);
  }, [artists, query, cat]);

  const n = items.length;
  const cur = items[Math.min(active, Math.max(0, n - 1))];
  const key = `${cat}|${query}`;
  const collapsed = !reduce && !firstDeal.current && dealtFor !== key;

  useEffect(() => {
    const mqM = window.matchMedia("(max-width: 639px)");
    const mqT = window.matchMedia("(max-width: 1023px)");
    const mqR = window.matchMedia("(prefers-reduced-motion: reduce)");
    const update = () => {
      setMode(mqM.matches ? "mobile" : mqT.matches ? "tablet" : "desktop");
      setReduce(mqR.matches);
    };
    update();
    mqM.addEventListener("change", update);
    mqT.addEventListener("change", update);
    mqR.addEventListener("change", update);
    return () => {
      mqM.removeEventListener("change", update);
      mqT.removeEventListener("change", update);
      mqR.removeEventListener("change", update);
    };
  }, []);

  useEffect(() => {
    const name = cur?.name;
    setGiant((g) => (g.cur === name ? g : { cur: name, prev: g.cur, k: g.k + 1 }));
    const t = setTimeout(() => setGiant((g) => (g.prev ? { ...g, prev: undefined } : g)), 1100);
    return () => clearTimeout(t);
  }, [cur?.name]);

  useEffect(() => {
    if (dealtFor === key) return;
    if (firstDeal.current) {
      firstDeal.current = false;
      setDealtFor(key);
      return;
    }
    let t: ReturnType<typeof setTimeout>;
    const r = requestAnimationFrame(() =>
      requestAnimationFrame(() => {
        setStagger(true);
        setDealtFor(key);
        t = setTimeout(() => setStagger(false), 1000);
      }),
    );
    return () => {
      cancelAnimationFrame(r);
      clearTimeout(t);
    };
  }, [key, dealtFor]);

  // On narrow screens the filter row scrolls: keep the active filter in view.
  useEffect(() => {
    const box = chipsRef.current;
    const on = box?.querySelector<HTMLElement>(".pcol-chip.on");
    if (!box || !on || box.scrollWidth <= box.clientWidth + 1) return;
    box.scrollTo({ left: on.offsetLeft - (box.clientWidth - on.offsetWidth) / 2, behavior: reduce ? "auto" : "smooth" });
  }, [cat, query, mode, reduce, filters.length]);

  const wrapDist = (i: number) => {
    let d = i - active;
    if (d > n / 2) d -= n;
    if (d < -n / 2) d += n;
    return d;
  };

  function go(i: number) {
    if (n === 0) return;
    setActive(((i % n) + n) % n);
    setDragU(0);
  }
  const move = (d: number) => go(active + d);

  function pickCat(k: string) {
    if (k === cat && !query) return;
    setSwapping(true);
    if (swapTimer.current) clearTimeout(swapTimer.current);
    swapTimer.current = setTimeout(() => {
      setCat(k);
      setQuery("");
      setActive(0);
      setSwapping(false);
    }, 260);
  }

  function open(a: ShowcaseArtist) {
    if (!editMode) router.push(`/artistas/${a.slug}`);
  }

  function onPointerDown(e: React.PointerEvent) {
    sx.current = e.clientX;
    moved.current = false;
    unit.current = (stageRef.current?.querySelector(".pcol-slot")?.getBoundingClientRect().width ?? 300) * 0.5;
    const onMove = (ev: PointerEvent) => {
      if (sx.current === null) return;
      const dx = ev.clientX - sx.current;
      if (!dragRef.current && Math.abs(dx) > 8) {
        dragRef.current = true;
        moved.current = true;
        setDragging(true);
      }
      if (dragRef.current) {
        dragVal.current = Math.max(-1.6, Math.min(1.6, dx / unit.current));
        setDragU(dragVal.current);
      }
    };
    const onUp = () => {
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
      window.removeEventListener("pointercancel", onUp);
      sx.current = null;
      if (dragRef.current) {
        dragRef.current = false;
        setDragging(false);
        const steps = -Math.round(dragVal.current);
        dragVal.current = 0;
        setDragU(0);
        if (steps !== 0 && n > 0) setActive((a) => (((a + steps) % n) + n) % n);
      }
      setTimeout(() => (moved.current = false), 30);
    };
    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp);
    window.addEventListener("pointercancel", onUp);
  }

  function onWheel(e: React.WheelEvent) {
    if (Math.abs(e.deltaX) <= Math.abs(e.deltaY) || Math.abs(e.deltaX) < 20) return;
    const now = Date.now();
    if (now - wheelLock.current < 450) return;
    wheelLock.current = now;
    move(e.deltaX > 0 ? 1 : -1);
  }

  function onKeyDown(e: React.KeyboardEvent) {
    if ((e.target as HTMLElement).tagName === "INPUT") return;
    if (e.key === "ArrowRight") {
      e.preventDefault();
      move(1);
    } else if (e.key === "ArrowLeft") {
      e.preventDefault();
      move(-1);
    }
  }

  function tilt(e: React.PointerEvent<HTMLDivElement>, isActive: boolean) {
    if (reduce || !isActive || dragging || e.pointerType === "touch") return;
    const card = e.currentTarget;
    const r = card.getBoundingClientRect();
    const px = (e.clientX - r.left) / r.width - 0.5;
    const py = (e.clientY - r.top) / r.height - 0.5;
    card.style.setProperty("--ty", `${(px * 3).toFixed(2)}deg`);
    card.style.setProperty("--tx", `${(-py * 3).toFixed(2)}deg`);
    card.style.setProperty("--px", `${(-px * 5).toFixed(1)}px`);
    card.style.setProperty("--py", `${(-py * 5).toFixed(1)}px`);
    card.style.setProperty("--gx2", `${((px + 0.5) * 100).toFixed(0)}%`);
    card.style.setProperty("--gy2", `${((py + 0.5) * 100).toFixed(0)}%`);
  }
  function untilt(e: React.PointerEvent<HTMLDivElement>) {
    const c = e.currentTarget;
    ["--ty", "--tx", "--px", "--py"].forEach((k) => c.style.removeProperty(k));
  }

  const S = STATES[mode];

  return (
    <section id="colecciones" className="pcol" aria-label="Colecciones POPE" onKeyDown={onKeyDown}>
      <header className="pcol-head">
        <p className="pcol-eyebrow">{eyebrow}</p>
        <h2 className="pcol-title">
          <span>{heading}</span>
        </h2>
        <div className="pcol-bar" aria-hidden="true">
          <i />
          <i />
          <i />
        </div>
      </header>

      <div className="pcol-filters">
        {(
          <nav ref={chipsRef} className="pcol-chips" aria-label="Categorías">
            {filters.map((f) => (
              <button key={f} type="button" className={`pcol-chip${!query && f === cat ? " on" : ""}`} onClick={() => pickCat(f)}>
                {f}
              </button>
            ))}
          </nav>
        )}
        <div className={`pcol-search${searchOpen ? " open" : ""}`}>
          <input
            ref={searchRef}
            className="pcol-sinput"
            type="search"
            placeholder="Buscar una colección..."
            autoComplete="off"
            aria-label="Buscar una colección"
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setActive(0);
            }}
          />
          <button
            type="button"
            className="pcol-sbtn"
            aria-label="Buscar colección"
            aria-expanded={searchOpen}
            onClick={() => {
              const next = !searchOpen;
              setSearchOpen(next);
              if (next) setTimeout(() => searchRef.current?.focus(), 0);
            }}
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" aria-hidden="true">
              <circle cx="11" cy="11" r="7" />
              <path d="m20 20-3.8-3.8" />
            </svg>
          </button>
        </div>
      </div>

      <div
        ref={stageRef}
        className="pcol-stage"
        style={{ "--gx": (-dragU * 46).toFixed(1) } as CSSProperties}
        tabIndex={0}
        aria-label="Carrusel de colecciones. Usa las flechas del teclado para navegar."
        onWheel={onWheel}
      >
        <div className="pcol-giant" aria-hidden="true">
          {giant.prev && (
            <span key={`p${giant.k}`} className="pcol-g out">
              {giant.prev}
            </span>
          )}
          <span key={`c${giant.k}`} className="pcol-g in">
            {giant.cur}
          </span>
        </div>
        <div className="pcol-floor" aria-hidden="true" />
        <div className={`pcol-ring${swapping ? " swap" : ""}${dragging ? " drag grabbing" : ""}`} onPointerDown={onPointerDown}>
          {items.map((a, i) => {
            const d = wrapDist(i) + dragU;
            const ad = Math.abs(d);
            const sg = d < 0 ? -1 : 1;
            const st = collapsed ? COLLAPSED : stateAt(S, ad);
            const hidden = st.o < 0.02;
            const isAct = ad < 0.5;
            const style = {
              "--x": (st.x * sg).toFixed(3),
              "--s": st.s.toFixed(3),
              "--o": st.o.toFixed(3),
              "--d": st.d.toFixed(3),
              "--z": `${st.z.toFixed(1)}px`,
              "--ry": `${(-sg * st.r).toFixed(2)}deg`,
              "--zi": Math.round(100 - ad * 10),
              transitionDelay: stagger && !reduce ? `${Math.round(Math.min(ad, 3) * 45)}ms` : undefined,
              ...(collapsed ? { transition: "none" } : null),
            } as CSSProperties;
            return (
              <article
                key={`${key}:${a.id}`}
                className={`pcol-slot${isAct ? " act" : ""}${ad > 2.4 || hidden ? " hide" : ""}`}
                style={style}
                tabIndex={hidden ? -1 : 0}
                aria-hidden={hidden}
                aria-label={`${a.name}, ${designsLabel(a.count)}`}
                onClick={() => {
                  if (moved.current) return;
                  if (wrapDist(i) === 0) open(a);
                  else go(i);
                }}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault();
                    if (wrapDist(i) === 0) open(a);
                    else go(i);
                  }
                }}
              >
                <div className="pcol-card" onPointerMove={(e) => tilt(e, isAct)} onPointerLeave={untilt}>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={a.imageUrl} alt={a.name} loading={i < 8 ? "eager" : "lazy"} decoding="sync" draggable={false} />
                  <span className="pcol-dim" />
                  <span className="pcol-shade" />
                  <span className="pcol-glare" />
                  <div className="pcol-meta">
                    <h3>{a.name}</h3>
                    <p>{designsLabel(a.count)}</p>
                    <EditableLink href={`/artistas/${a.slug}`} className="pcol-cta" tabIndex={isAct ? 0 : -1} onClick={(e) => e.stopPropagation()}>
                      {ctaLabel} <span aria-hidden="true">→</span>
                    </EditableLink>
                  </div>
                </div>
              </article>
            );
          })}
        </div>
        {n === 0 && <div className="pcol-empty">{query ? "No encontramos esa colección" : "Muy pronto: aún no hay colecciones en esta sección"}</div>}
        <button type="button" className="pcol-arrow l" onClick={() => move(-1)} aria-label="Colección anterior">
          ←
        </button>
        <button type="button" className="pcol-arrow r" onClick={() => move(1)} aria-label="Colección siguiente">
          →
        </button>
      </div>

      <div className="pcol-foot">
        <div className="pcol-ticks" role="tablist" aria-label="Ir a una colección">
          {items.map((a, i) => (
            <button
              key={a.id}
              type="button"
              role="tab"
              aria-selected={i === active}
              aria-label={`Ir a ${a.name}`}
              className={`pcol-tick${i === active ? " on" : ""}`}
              onClick={() => go(i)}
            />
          ))}
        </div>
        <div className="pcol-count">
          <b>{pad(n ? Math.min(active, n - 1) + 1 : 0)}</b> / {pad(n)}
        </div>
      </div>
      <p className="sr-only" aria-live="polite">
        {cur ? `${cur.name}, ${designsLabel(cur.count)}, ${Math.min(active, n - 1) + 1} de ${n}` : ""}
      </p>
    </section>
  );
}
