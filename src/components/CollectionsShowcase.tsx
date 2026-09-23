"use client";

import { useEffect, useMemo, useRef, useState, type CSSProperties, type ReactNode } from "react";

export type ShowcaseDesign = { id: string; name: string; imageUrl: string };
export type ShowcaseCollection = { id: string; name: string; designs: ShowcaseDesign[] };

type Item = ShowcaseDesign & { collection: string };

export default function CollectionsShowcase({
  collections,
  eyebrow,
  heading,
  subtext,
  cta,
}: {
  collections: ShowcaseCollection[];
  eyebrow: ReactNode;
  heading: ReactNode;
  subtext: ReactNode;
  cta: ReactNode;
}) {
  const [catIndex, setCatIndex] = useState(0);
  const [active, setActive] = useState(0);
  const [query, setQuery] = useState("");
  const [searchOpen, setSearchOpen] = useState(false);
  const [mobile, setMobile] = useState(false);
  const [hovering, setHovering] = useState(false);
  const [visible, setVisible] = useState(true);
  const rootRef = useRef<HTMLElement>(null);
  const searchRef = useRef<HTMLInputElement>(null);
  const dragStartX = useRef<number | null>(null);
  const suppressClick = useRef(false);
  const wheelLock = useRef(0);

  const items: Item[] = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (q) {
      return collections
        .flatMap((c) => c.designs.map((d) => ({ ...d, collection: c.name })))
        .filter((d) => `${d.name} ${d.collection}`.toLowerCase().includes(q));
    }
    const c = collections[catIndex] ?? collections[0];
    return c ? c.designs.map((d) => ({ ...d, collection: c.name })) : [];
  }, [collections, catIndex, query]);

  const n = items.length;
  const current = items[Math.min(active, Math.max(0, n - 1))];

  useEffect(() => {
    const mq = window.matchMedia("(max-width: 900px)");
    const update = () => setMobile(mq.matches);
    update();
    mq.addEventListener("change", update);
    return () => mq.removeEventListener("change", update);
  }, []);

  useEffect(() => {
    const el = rootRef.current;
    if (!el || !("IntersectionObserver" in window)) return;
    const io = new IntersectionObserver(([e]) => setVisible(e.isIntersecting), { threshold: 0.25 });
    io.observe(el);
    return () => io.disconnect();
  }, []);

  // Autoplay: restarts after every change (so a manual tap gets a full pause), and rests while the
  // visitor is pointing at the stage or the section is off-screen. Deliberately NOT tied to the OS
  // "reduce motion" setting — this carousel is the point of the section.
  useEffect(() => {
    if (hovering || !visible || n < 2) return;
    const id = setInterval(() => setActive((a) => (a + 1) % n), 4600);
    return () => clearInterval(id);
  }, [hovering, visible, n, active]);

  function go(i: number) {
    if (n === 0) return;
    setActive(((i % n) + n) % n);
  }
  function move(delta: number) {
    go(active + delta);
  }
  function pickCategory(i: number) {
    setCatIndex(i);
    setActive(0);
    setQuery("");
  }
  function signedDistance(i: number) {
    let d = i - active;
    if (d > n / 2) d -= n;
    if (d < -n / 2) d += n;
    return d;
  }

  function onPointerDown(e: React.PointerEvent) {
    dragStartX.current = e.clientX;
    const up = (ev: PointerEvent) => {
      window.removeEventListener("pointerup", up);
      window.removeEventListener("pointercancel", up);
      const start = dragStartX.current;
      dragStartX.current = null;
      if (start === null) return;
      const dx = ev.clientX - start;
      if (Math.abs(dx) > 35) {
        suppressClick.current = true;
        setTimeout(() => (suppressClick.current = false), 60);
        setActive((a) => (((a + (dx < 0 ? 1 : -1)) % n) + n) % n);
      }
    };
    window.addEventListener("pointerup", up);
    window.addEventListener("pointercancel", up);
  }

  function onWheel(e: React.WheelEvent) {
    // Only sideways swipes turn the carousel — plain vertical scrolling must keep scrolling the page.
    if (Math.abs(e.deltaX) <= Math.abs(e.deltaY) || Math.abs(e.deltaX) < 20) return;
    const now = Date.now();
    if (now - wheelLock.current < 450) return;
    wheelLock.current = now;
    move(e.deltaX > 0 ? 1 : -1);
  }

  function onKeyDown(e: React.KeyboardEvent) {
    if (e.key === "ArrowRight") {
      e.preventDefault();
      move(1);
    } else if (e.key === "ArrowLeft") {
      e.preventDefault();
      move(-1);
    }
  }

  const spread = mobile ? 58 : 92;
  const lift = mobile ? 12 : 18;
  const depth = mobile ? 105 : 145;
  const tilt = mobile ? 7 : 10;

  return (
    <section ref={rootRef} id="colecciones" className="pcol" aria-label="Colecciones POPE" onKeyDown={onKeyDown}>
      <header className="pcol-top">
        <div className="pcol-eyebrow">{eyebrow}</div>
        <div className="pcol-counter">
          <span>{String(n === 0 ? 0 : Math.min(active, n - 1) + 1).padStart(2, "0")}</span> / {String(n).padStart(2, "0")}
        </div>
      </header>

      <div className="pcol-copy">
        <h2>{heading}</h2>
        <p>{subtext}</p>
      </div>

      {current && (
        <div className="pcol-artist" aria-live="polite">
          <span className="pcol-artist-type">{current.collection}</span>
          <strong>{current.name}</strong>
        </div>
      )}

      <div
        className="pcol-stage"
        aria-label="Carrusel de diseños"
        onPointerDown={onPointerDown}
        onWheel={onWheel}
        onMouseEnter={() => setHovering(true)}
        onMouseLeave={() => setHovering(false)}
      >
        <div className="pcol-ring">
          {items.map((item, i) => {
            const d = signedDistance(i);
            const ad = Math.abs(d);
            const style = {
              "--x": `${d * spread}px`,
              "--y": `${ad * lift}px`,
              "--z": `${-ad * depth}px`,
              "--ry": `${-d * tilt}deg`,
              "--s": Math.max(0.7, 1 - ad * 0.075),
              opacity: ad > 3 ? 0 : Math.max(0.28, 1 - ad * 0.21),
              filter: `brightness(${Math.max(0.45, 1 - ad * 0.15)})`,
              zIndex: 20 - ad,
            } as CSSProperties;
            return (
              <article
                key={item.id}
                className={`pcol-card${d === 0 ? " is-active" : ""}${ad > 3 ? " is-hidden" : ""}`}
                style={style}
                tabIndex={ad > 3 ? -1 : 0}
                aria-hidden={ad > 3}
                aria-label={`${item.name} — ${item.collection}`}
                onClick={() => {
                  if (!suppressClick.current) go(i);
                }}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault();
                    go(i);
                  }
                }}
              >
                <div className="pcol-face">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={item.imageUrl} alt={item.name} draggable={false} />
                </div>
                <div className="pcol-meta">
                  <b>{item.name}</b>
                  <span>Personalizable</span>
                </div>
              </article>
            );
          })}
        </div>
        {n === 0 && <div className="pcol-empty">No encontramos ese diseño.</div>}
      </div>

      <div className="pcol-controls">
        <button type="button" className="pcol-round" onClick={() => move(-1)} aria-label="Diseño anterior">
          ←
        </button>
        {cta}
        <button type="button" className="pcol-round" onClick={() => move(1)} aria-label="Diseño siguiente">
          →
        </button>
      </div>

      <aside className="pcol-rail" aria-label="Buscar por sección">
        <div className={`pcol-search-wrap${searchOpen ? " open" : ""}`}>
          <input
            ref={searchRef}
            className="pcol-search"
            type="search"
            placeholder="Buscar diseño…"
            autoComplete="off"
            aria-label="Buscar diseño"
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setActive(0);
            }}
          />
          <button
            type="button"
            className="pcol-search-toggle"
            aria-label={searchOpen ? "Cerrar búsqueda" : "Abrir búsqueda"}
            onClick={() => {
              const next = !searchOpen;
              setSearchOpen(next);
              if (next) setTimeout(() => searchRef.current?.focus(), 0);
            }}
          >
            <svg width="21" height="21" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" aria-hidden="true">
              <circle cx="11" cy="11" r="7" />
              <path d="m20 20-3.8-3.8" />
            </svg>
          </button>
        </div>
        {collections.length > 1 &&
          collections.map((c, i) => (
            <button
              key={c.id}
              type="button"
              className={`pcol-category${!query && i === catIndex ? " active" : ""}`}
              onClick={() => pickCategory(i)}
            >
              {c.name}
            </button>
          ))}
      </aside>
    </section>
  );
}
