"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useEditMode } from "@/components/edit/EditModeContext";
import Txt from "@/components/edit/Txt";
import { useSiteTexts } from "@/components/SiteContentProvider";

export const VIDEO_SLOTS = 8;

type Card = { n: number; src: string; tag: string; caption: string };
function PlayIcon({ className = "h-6 w-6" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className={className} aria-hidden="true">
      <path d="M8 5.5v13a1 1 0 001.5.86l10.5-6.5a1 1 0 000-1.72L9.5 4.64A1 1 0 008 5.5z" />
    </svg>
  );
}

// Vertical videos of finished garments as a row of cards: the one you point at (or tap) opens up and plays,
// silently and in a loop; the others stay folded as slim strips on their first frame. There is no sound and no
// full-screen player. Nothing is shown until the owner uploads a video (edit mode → «Imágenes y contacto»).
export default function RealVideos() {
  const { editMode } = useEditMode();
  const texts = useSiteTexts();
  const [active, setActive] = useState(0);
  const [inView, setInView] = useState(false);
  // The videos are big: nothing is downloaded until the section is about to be reached, and on
  // low-power phones only the open card loads (the rest stay as dark strips until opened).
  const [near, setNear] = useState(false);
  const [reduceMotion, setReduceMotion] = useState(false);
  const sectionRef = useRef<HTMLElement>(null);
  const listRef = useRef<HTMLUListElement>(null);
  const videoRefs = useRef<(HTMLVideoElement | null)[]>([]);
  const hoverTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastPoint = useRef({ x: -1, y: -1 });
  // 'hover' openings must never scroll the row (that would slide strips under the cursor)
  const source = useRef<"hover" | "tap">("tap");
  // Set when the browser refused to autoplay, or while the (large) clip is still buffering.
  const [blocked, setBlocked] = useState(false);
  const [buffering, setBuffering] = useState(false);

  const all: Card[] = useMemo(() => {
    const out: Card[] = [];
    for (let n = 1; n <= VIDEO_SLOTS; n++) {
      const src = (texts[`video.${n}.src`] ?? "").trim();
      if (src) out.push({ n, src, tag: (texts[`video.${n}.tag`] ?? "").trim(), caption: (texts[`video.${n}.caption`] ?? "").trim() });
    }
    return out;
  }, [texts]);

  const cards = all;
  const hasVideos = all.length > 0;
  const current = Math.min(active, Math.max(0, cards.length - 1));

  useEffect(() => {
    setReduceMotion(window.matchMedia("(prefers-reduced-motion: reduce)").matches);
    const el = sectionRef.current;
    if (!el || !("IntersectionObserver" in window)) {
      setInView(true);
      setNear(true);
      return;
    }
    const io = new IntersectionObserver(([e]) => setInView(e.isIntersecting), { threshold: 0.25 });
    const ioNear = new IntersectionObserver(([e]) => e.isIntersecting && setNear(true), { rootMargin: "700px 0px" });
    io.observe(el);
    ioNear.observe(el);
    return () => {
      io.disconnect();
      ioNear.disconnect();
    };
  }, [hasVideos]);

  // Only the open card plays (muted, looping), and only while the section is on screen: the other strips stay on their
  // first frame. This is the point of the section, so it plays with "reduce motion" and on slow devices too (one small video).
  useEffect(() => {
    cards.forEach((_, i) => {
      const v = videoRefs.current[i];
      if (!v) return;
      if (i === current && inView) {
        v.play().then(() => setBlocked(false)).catch(() => setBlocked(true));
      } else v.pause();
    });
  }, [cards, current, inView]);

  // On phones the row scrolls sideways: keep the open card in view.
  useEffect(() => {
    const ul = listRef.current;
    if (!ul || source.current === "hover" || ul.scrollWidth <= ul.clientWidth + 1) return;
    const rem = parseFloat(getComputedStyle(document.documentElement).fontSize) || 16;
    const wide = window.innerWidth >= 640;
    const closedW = (wide ? 5.25 : 4.25) * rem;
    const openW = ((wide ? 32 : 26) * rem * 9) / 16;
    const gap = 0.5 * rem;
    const padLeft = 1.5 * rem;
    const left = padLeft + current * (closedW + gap) - (ul.clientWidth - openW) / 2;
    ul.scrollTo({ left: Math.max(0, left), behavior: reduceMotion ? "auto" : "smooth" });
  }, [current, reduceMotion]);

  if (all.length === 0) {
    if (!editMode) return null;
    return (
      <section className="border-t border-neutral-800 bg-black">
        <div className="mx-auto max-w-6xl px-6 py-10 text-center">
          <p className="text-sm text-neutral-400">
            Aquí aparecerán tus videos verticales. Súbelos en «Imágenes y contacto» → Videos (hasta {VIDEO_SLOTS}). Mientras no subas
            ninguno, esta sección no se muestra a los visitantes.
          </p>
        </div>
      </section>
    );
  }

  return (
    <section ref={sectionRef} className="overflow-hidden border-t border-neutral-800 bg-black">
      <div className="mx-auto max-w-6xl px-6 pb-4 pt-16">
        <div className="text-center">
          <Txt k="videos.eyebrow" as="p" className="mb-1 block font-script text-3xl text-neon" />
          <Txt k="videos.heading" as="h2" className="block text-4xl font-bold uppercase text-white sm:text-5xl" />
          <Txt k="videos.subtext" as="p" multiline className="mx-auto mt-2 block max-w-xl text-neutral-400" />
        </div>
      </div>

      <ul
        ref={listRef}
        className="pope-accordion flex items-stretch gap-2 overflow-x-auto px-6 pb-14 pt-8 [scrollbar-width:none] lg:justify-center [&::-webkit-scrollbar]:hidden"
        aria-label="Videos de prendas hechas"
      >
        {cards.map((c, i) => {
          const on = i === current;
          return (
            <li key={c.n} className={`pope-strip ${on ? "is-open" : ""}`}>
              <button
                type="button"
                onMouseMove={(e) => {
                  // Strips slide while they open/close, which makes the browser report a new
                  // element under a perfectly still cursor. Only a real movement counts.
                  const moved = Math.abs(e.clientX - lastPoint.current.x) > 2 || Math.abs(e.clientY - lastPoint.current.y) > 2;
                  lastPoint.current = { x: e.clientX, y: e.clientY };
                  if (!moved || on) {
                    if (on && hoverTimer.current) clearTimeout(hoverTimer.current);
                    return;
                  }
                  if (hoverTimer.current) clearTimeout(hoverTimer.current);
                  hoverTimer.current = setTimeout(() => {
                    source.current = "hover";
                    setActive(i);
                  }, 140);
                }}
                onMouseLeave={() => {
                  if (hoverTimer.current) clearTimeout(hoverTimer.current);
                }}
                onFocus={() => {
                  source.current = "tap";
                  setActive(i);
                }}
                onClick={() => {
                  if (on) return;
                  source.current = "tap";
                  setActive(i);
                  setBlocked(false);
                  const v = videoRefs.current[i];
                  if (v) {
                    v.muted = true;
                    v.play().catch(() => setBlocked(true));
                  }
                }}
                aria-label={`${on ? "Reproduciendo" : "Ver"}${c.caption ? `: ${c.caption}` : ""}`}
                aria-current={on}
                className={`group relative block h-full w-full overflow-hidden rounded-3xl border-2 bg-neutral-900 text-left transition-[border-color,box-shadow] duration-[900ms] ease-in-out ${
                  on ? "border-neon shadow-[0_0_38px_-6px_color-mix(in_srgb,var(--neon)_65%,transparent)]" : "border-white/10"
                }`}
              >
                <video
                  ref={(el) => {
                    videoRefs.current[i] = el;
                    if (el) {
                      // React sets `muted` as a property only; iOS/Safari also want the attribute
                      el.defaultMuted = true;
                      el.muted = true;
                      el.setAttribute("muted", "");
                    }
                  }}
                  onWaiting={() => on && setBuffering(true)}
                  onPlaying={() => {
                    setBuffering(false);
                    setBlocked(false);
                  }}
                  onCanPlay={() => setBuffering(false)}
                  src={near ? `${c.src}#t=0.1` : undefined}
                  muted
                  loop
                  playsInline
                  preload={on ? "auto" : "metadata"}
                  tabIndex={-1}
                  aria-hidden="true"
                  className={`pointer-events-none h-full w-full transform-gpu object-cover transition-transform duration-[900ms] ease-out ${
                    on ? "scale-100" : "scale-[1.12]"
                  }`}
                />
                <span className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/90 via-black/5 to-black/35" />
                <span
                  className={`pointer-events-none absolute inset-0 bg-black transition-opacity duration-500 ${on ? "opacity-0" : "opacity-45 group-hover:opacity-20"}`}
                  aria-hidden="true"
                />

                {/* Folded strip: the title runs vertically (fades out as the card opens) */}
                <span
                  className={`pointer-events-none absolute inset-x-0 bottom-5 flex justify-center transition-opacity duration-500 ${
                    on ? "opacity-0" : "opacity-100 delay-500"
                  }`}
                >
                  <span className="font-display text-2xl font-bold uppercase leading-none tracking-wide text-white [text-orientation:mixed] [writing-mode:vertical-rl] rotate-180">
                    {c.caption || c.tag || `Video ${i + 1}`}
                  </span>
                </span>

                {/* Open card: spinner / play hint only while open */}
                {on && buffering && !blocked && (
                  <span className="pointer-events-none absolute right-3 top-3 h-9 w-9 animate-spin rounded-full border-2 border-white/25 border-t-neon" aria-label="Cargando video" />
                )}
                {on && blocked && (
                  <span className="pointer-events-none absolute left-1/2 top-1/2 flex h-16 w-16 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full bg-black/55 text-neon backdrop-blur-sm">
                    <PlayIcon className="h-7 w-7" />
                  </span>
                )}

                {/* Open card: chip and title (fade in once open, out at once) */}
                <span
                  className={`pointer-events-none absolute inset-0 transition-[opacity,transform] ${
                    on ? "translate-y-0 opacity-100 delay-[450ms] duration-700" : "translate-y-3 opacity-0 duration-300"
                  }`}
                >
                  {c.tag && (
                    <span className="glass-neon absolute left-3 top-3 rounded-full px-3 py-0.5 font-display text-lg font-bold uppercase leading-none tracking-wide text-black">
                      {c.tag}
                    </span>
                  )}
                  <span className="absolute inset-x-4 bottom-4 flex flex-col gap-2">
                    {c.caption && <span className="font-display text-4xl font-bold uppercase leading-[0.9] text-white">{c.caption}</span>}
                  </span>
                </span>
              </button>
            </li>
          );
        })}
      </ul>

    </section>
  );
}
