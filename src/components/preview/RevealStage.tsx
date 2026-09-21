"use client";

import { useEffect, useRef, useState, type CSSProperties } from "react";
import { setHoodieColor, useHoodieColor, type HoodieColor } from "@/lib/hoodie-color";

export type HoodieVariant = { id: string; label: string; swatch: string; before: string; after: string };

const clamp = (v: number, min: number, max: number) => Math.min(max, Math.max(min, v));
const ease = (t: number) => (t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2);
const radius = (w: number, touch: boolean) => (touch ? clamp(w * 0.36, 100, 190) : clamp(w * 0.3, 90, 190));

// Before/after comparison of the SAME garment photo (the "after" is that image
// with a design composited on it). A soft spotlight reveals the design: it
// follows the cursor on desktop and the finger on touch screens (held slightly
// above the fingertip so the hand doesn't cover it). Only CSS variables change
// per frame — no canvas and no base64 images.
export default function RevealStage({ variants, alt }: { variants: HoodieVariant[]; alt: string }) {
  const active = useHoodieColor();
  const stageRef = useRef<HTMLDivElement>(null);
  const [touchUI, setTouchUI] = useState(false);
  const [touched, setTouched] = useState(false);
  const interacted = useRef(false);
  const loop = useRef(0);
  const demo = useRef(0);
  const release = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const s = useRef({ x: 0, y: 0, r: 0, tx: 0, ty: 0, tr: 0 });

  function apply() {
    const el = stageRef.current;
    if (!el) return;
    el.style.setProperty("--x", `${s.current.x}px`);
    el.style.setProperty("--y", `${s.current.y}px`);
    el.style.setProperty("--r", `${Math.max(0, s.current.r)}px`);
  }

  function tick() {
    const c = s.current;
    c.x += (c.tx - c.x) * 0.16;
    c.y += (c.ty - c.y) * 0.16;
    c.r += (c.tr - c.r) * 0.14;
    apply();
    const moving = Math.abs(c.tx - c.x) > 0.4 || Math.abs(c.ty - c.y) > 0.4 || Math.abs(c.tr - c.r) > 0.4;
    loop.current = moving ? requestAnimationFrame(tick) : 0;
  }

  function kick() {
    if (!loop.current) loop.current = requestAnimationFrame(tick);
  }

  function markInteracted() {
    interacted.current = true;
    cancelAnimationFrame(demo.current);
    setTouched(true);
  }

  useEffect(() => {
    const canHover = window.matchMedia("(any-hover: hover) and (any-pointer: fine)").matches;
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    setTouchUI(!canHover);
    if (reduce) {
      // No motion: show the finished design (a spotlight big enough to cover the garment).
      const el = stageRef.current;
      if (el) {
        s.current = { x: el.clientWidth / 2, y: el.clientHeight / 2, r: el.clientWidth, tx: 0, ty: 0, tr: 0 };
        apply();
      }
      return;
    }
    // One short automatic demo so the visitor sees what the effect does.
    const startDelay = setTimeout(() => {
      const el = stageRef.current;
      if (!el || interacted.current) return;
      const w = el.clientWidth;
      const h = el.clientHeight;
      const t0 = performance.now();
      const total = 3200;
      const step = (now: number) => {
        if (interacted.current) return;
        const t = clamp((now - t0) / total, 0, 1);
        const c = s.current;
        c.tx = w * (0.2 + 0.6 * ease(Math.min(1, t / 0.85)));
        c.ty = h * (0.45 + 0.1 * Math.sin(t * Math.PI * 2));
        c.tr = t < 0.85 ? radius(w, !canHover) : 0;
        if (t === 0) {
          c.x = c.tx;
          c.y = c.ty;
        }
        kick();
        if (t < 1) demo.current = requestAnimationFrame(step);
      };
      demo.current = requestAnimationFrame(step);
    }, 1900);
    return () => {
      clearTimeout(startDelay);
      clearTimeout(release.current);
      cancelAnimationFrame(demo.current);
      cancelAnimationFrame(loop.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function aim(e: React.PointerEvent) {
    const el = stageRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const touch = e.pointerType === "touch" || e.pointerType === "pen";
    if (touch !== touchUI) setTouchUI(touch);
    markInteracted();
    clearTimeout(release.current);
    const c = s.current;
    const first = c.r < 1;
    c.tx = e.clientX - rect.left;
    c.ty = e.clientY - rect.top - (touch ? clamp(rect.height * 0.1, 30, 60) : 0);
    c.tr = radius(rect.width, touch);
    if (first) {
      c.x = c.tx;
      c.y = c.ty;
    }
    kick();
  }

  function onPointerMove(e: React.PointerEvent) {
    // A mouse hovers; a finger only reports moves while it is touching.
    aim(e);
  }

  function onPointerUp(e: React.PointerEvent) {
    if (e.pointerType === "mouse") return;
    // Let the design linger for a moment after the finger lifts, then fade it.
    clearTimeout(release.current);
    release.current = setTimeout(() => {
      s.current.tr = 0;
      kick();
    }, 1400);
  }

  function onPointerLeave(e: React.PointerEvent) {
    if (e.pointerType !== "mouse") return;
    s.current.tr = 0;
    kick();
  }

  function fromKeyboard(v: number) {
    const el = stageRef.current;
    if (!el) return;
    markInteracted();
    const c = s.current;
    c.tx = (el.clientWidth * v) / 100;
    c.ty = el.clientHeight * 0.45;
    c.tr = radius(el.clientWidth, false);
    if (c.r < 1) {
      c.x = c.tx;
      c.y = c.ty;
    }
    kick();
  }

  const style = { "--x": "50%", "--y": "50%", "--r": "0px" } as CSSProperties;

  return (
    <div className="relative mx-auto w-full max-w-[680px]">
      <div
        ref={stageRef}
        style={style}
        onPointerMove={onPointerMove}
        onPointerDown={aim}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerUp}
        onPointerLeave={onPointerLeave}
        className="reveal-spot relative aspect-[1200/990] w-full cursor-crosshair select-none touch-pan-y"
      >
        {variants.map((v, i) => (
          <div
            key={v.id}
            aria-hidden={v.id !== active}
            className={`pointer-events-none absolute inset-0 transition-[opacity,transform] duration-500 ease-out ${
              v.id === active ? "scale-100 opacity-100" : "scale-[0.97] opacity-0"
            }`}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={v.before}
              alt={`${alt} ${v.label.toLowerCase()} sin diseño`}
              width={1200}
              height={990}
              fetchPriority={i === 0 ? "high" : "auto"}
              decoding="async"
              draggable={false}
              className="absolute inset-0 h-full w-full object-contain"
            />
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={v.after}
              alt={`${alt} ${v.label.toLowerCase()} con un diseño personalizado`}
              width={1200}
              height={990}
              decoding="async"
              draggable={false}
              className="reveal-after absolute inset-0 h-full w-full object-contain"
            />
          </div>
        ))}

        <span className="glass-dark pointer-events-none absolute left-2 top-2 rounded-full px-3 py-1 font-display text-xl uppercase tracking-wide text-white">
          Antes
        </span>
        <span className="glass-neon pointer-events-none absolute right-2 top-2 rounded-full px-3 py-1 font-display text-xl uppercase tracking-wide text-black">
          Después
        </span>

        {!touched && (
          <p className="glass-dark pointer-events-none absolute bottom-3 left-1/2 flex -translate-x-1/2 items-center gap-2 whitespace-nowrap rounded-full px-4 py-2 text-sm font-medium text-white">
            <span className="pope-nudge text-neon" aria-hidden="true">
              ◎
            </span>
            {touchUI ? "Toca y arrastra sobre la prenda" : "Pasa el cursor sobre la prenda"}
          </p>
        )}
      </div>

      <div className="mt-4 flex flex-col items-center gap-2">
        <p className="font-script text-2xl text-neon">Elige el color</p>
        <div role="radiogroup" aria-label="Color del polerón" className="glass-dark flex gap-1 rounded-full p-1.5">
          {variants.map((v) => {
            const on = v.id === active;
            return (
              <button
                key={v.id}
                type="button"
                role="radio"
                aria-checked={on}
                onClick={() => setHoodieColor(v.id as HoodieColor)}
                className={`flex items-center gap-2 rounded-full px-4 py-2 font-display text-2xl uppercase leading-none tracking-wide transition-colors ${
                  on ? "glass-neon text-black" : "text-white hover:text-neon"
                }`}
              >
                <span
                  aria-hidden="true"
                  className="h-5 w-5 rounded-full border border-white/40"
                  style={{ background: v.swatch }}
                />
                {v.label}
              </button>
            );
          })}
        </div>
      </div>

      <label className="sr-only" htmlFor="pope-compare">
        Mover el foco que revela el diseño
      </label>
      <input
        id="pope-compare"
        type="range"
        min={0}
        max={100}
        defaultValue={50}
        onChange={(e) => {
          fromKeyboard(Number(e.target.value));
        }}
        className="sr-only"
      />
    </div>
  );
}
