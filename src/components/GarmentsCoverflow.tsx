"use client";

import { useEffect, useRef, useState, type CSSProperties } from "react";
import CollectionGarmentCard from "@/components/CollectionGarmentCard";
import type { GarmentItem } from "@/components/CollectionGarmentsGrid";
import { STATES, stateAt, type Mode } from "@/components/CollectionsShowcase";

const AUTO_MS = 3200;
// After the visitor moves it by hand the carousel waits this long and then keeps going.
const IDLE_MS = 8000;
const pad = (n: number) => String(n).padStart(2, "0");

// The ready-made garments as the same 3D carousel as the collections: the centre piece in front with a neon frame, the
// others fanned out behind it, turning by itself. A click on a side piece brings it to the centre.
export default function GarmentsCoverflow({ items, light = false, preferColor = "" }: { items: GarmentItem[]; light?: boolean; preferColor?: string }) {
  const n = items.length;
  const [active, setActive] = useState(0);
  const [mode, setMode] = useState<Mode>("desktop");
  const [inView, setInView] = useState(false);
  const [tabVisible, setTabVisible] = useState(true);
  const rootRef = useRef<HTMLDivElement>(null);
  const lastTouch = useRef(0);
  const hovering = useRef(false);
  const sx = useRef<number | null>(null);
  const moved = useRef(false);
  const wheelLock = useRef(0);
  const cur = items[Math.min(active, n - 1)];

  useEffect(() => {
    const mqM = window.matchMedia("(max-width: 639px)");
    const mqT = window.matchMedia("(max-width: 1023px)");
    const update = () => setMode(mqM.matches ? "mobile" : mqT.matches ? "tablet" : "desktop");
    update();
    mqM.addEventListener("change", update);
    mqT.addEventListener("change", update);
    return () => {
      mqM.removeEventListener("change", update);
      mqT.removeEventListener("change", update);
    };
  }, []);

  useEffect(() => {
    const el = rootRef.current;
    if (!el || !("IntersectionObserver" in window)) return;
    const io = new IntersectionObserver(([e]) => setInView(e.isIntersecting), { threshold: 0.3 });
    io.observe(el);
    const onVis = () => setTabVisible(!document.hidden);
    document.addEventListener("visibilitychange", onVis);
    return () => {
      io.disconnect();
      document.removeEventListener("visibilitychange", onVis);
    };
  }, []);

  // Keeps turning (also with "reduce motion": the owner wants it to move). Only a hand on it pauses it, for a few seconds.
  useEffect(() => {
    if (n < 2 || !inView || !tabVisible) return;
    const id = setInterval(() => {
      if (hovering.current || Date.now() - lastTouch.current < IDLE_MS) return;
      setActive((a) => (a + 1) % n);
    }, AUTO_MS);
    return () => clearInterval(id);
  }, [n, inView, tabVisible]);

  useEffect(() => {
    setActive(0);
  }, [n]);

  const wrapDist = (i: number) => {
    let d = i - active;
    if (d > n / 2) d -= n;
    if (d < -n / 2) d += n;
    return d;
  };
  const go = (i: number) => {
    if (n === 0) return;
    lastTouch.current = Date.now();
    setActive(((i % n) + n) % n);
  };
  const move = (d: number) => go(active + d);

  function onPointerDown(e: React.PointerEvent) {
    sx.current = e.clientX;
    moved.current = false;
    lastTouch.current = Date.now();
    let dx = 0;
    const onMove = (ev: PointerEvent) => {
      if (sx.current === null) return;
      dx = ev.clientX - sx.current;
      if (Math.abs(dx) > 8) moved.current = true;
    };
    const onUp = () => {
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
      window.removeEventListener("pointercancel", onUp);
      sx.current = null;
      if (Math.abs(dx) > 50 && n > 0) move(dx < 0 ? 1 : -1);
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
    if (e.key === "ArrowRight") {
      e.preventDefault();
      move(1);
    } else if (e.key === "ArrowLeft") {
      e.preventDefault();
      move(-1);
    }
  }

  if (n === 0) return null;
  const S = STATES[mode];

  return (
    <div ref={rootRef} className={`pcol pcol-flat${light ? " light" : ""}`} onKeyDown={onKeyDown}>
      <div className="pcol-stage" tabIndex={0} aria-label="Carrusel de prendas. Usa las flechas del teclado para navegar." onWheel={onWheel}>
        <div className="pcol-giant" aria-hidden="true">
          <span key={active} className="pcol-g in">
            {cur?.collectionName || cur?.groupName}
          </span>
        </div>
        <div className="pcol-floor" aria-hidden="true" />
        <div className="pcol-ring" onPointerDown={onPointerDown}>
          {items.map((it, i) => {
            const d = wrapDist(i);
            const ad = Math.abs(d);
            if (mode === "mobile" && ad > 2.2) return null;
            const sg = d < 0 ? -1 : 1;
            const st = stateAt(S, ad);
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
            } as CSSProperties;
            return (
              <div
                key={it.key}
                className={`pcol-slot pcol-gslot${isAct ? " act" : ""}${ad > 2.4 || hidden ? " hide" : ""}`}
                style={style}
                aria-hidden={hidden}
                onMouseEnter={() => isAct && (hovering.current = true)}
                onMouseLeave={() => (hovering.current = false)}
                onClickCapture={(e) => {
                  // A swipe that ends on a card must not open it.
                  if (moved.current) {
                    e.preventDefault();
                    e.stopPropagation();
                  }
                }}
              >
                <div className="pcol-gbox">
                  <ul>
                    <CollectionGarmentCard
                      href={it.href}
                      blankHref={it.blankHref}
                      title={it.title}
                      description={it.description}
                      badge={it.badge}
                      frontArt={it.frontArt}
                      backArt={it.backArt}
                      frontScale={it.frontScale}
                      backScale={it.backScale}
                      basePrice={it.basePrice}
                      compareAtPrice={it.compareAtPrice}
                      colors={it.colors}
                      preferColor={preferColor}
                      light={light}
                    />
                  </ul>
                  <span className="pcol-dim" />
                </div>
                {!isAct && !hidden && <button type="button" className="pcol-pick" aria-label={`Ver ${it.title}`} onClick={() => !moved.current && go(i)} />}
              </div>
            );
          })}
        </div>
        <button type="button" className="pcol-arrow l" onClick={() => move(-1)} aria-label="Prenda anterior">
          ←
        </button>
        <button type="button" className="pcol-arrow r" onClick={() => move(1)} aria-label="Prenda siguiente">
          →
        </button>
      </div>
      <div className="pcol-foot">
        <div className="pcol-count">
          <b>{pad(Math.min(active, n - 1) + 1)}</b> / {pad(n)}
        </div>
      </div>
    </div>
  );
}
