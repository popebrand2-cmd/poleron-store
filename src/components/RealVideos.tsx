"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
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

function Player({ cards, index, onIndex, onClose }: { cards: Card[]; index: number; onIndex: (i: number) => void; onClose: () => void }) {
  const card = cards[index];
  const videoRef = useRef<HTMLVideoElement>(null);
  const [muted, setMuted] = useState(false);
  const [paused, setPaused] = useState(false);
  const [progress, setProgress] = useState(0);
  const touchY = useRef<number | null>(null);

  const go = useCallback(
    (delta: number) => onIndex((index + delta + cards.length) % cards.length),
    [index, cards.length, onIndex],
  );

  // The tap that opened the player counts as a user gesture, so try to start with sound and
  // fall back to muted if the browser refuses.
  useEffect(() => {
    const v = videoRef.current;
    if (!v) return;
    setProgress(0);
    setPaused(false);
    v.muted = false;
    setMuted(false);
    v.play().catch(() => {
      v.muted = true;
      setMuted(true);
      v.play().catch(() => setPaused(true));
    });
  }, [card.src]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
      if (e.key === "ArrowRight" || e.key === "ArrowDown") go(1);
      if (e.key === "ArrowLeft" || e.key === "ArrowUp") go(-1);
    };
    document.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
    };
  }, [go, onClose]);

  function togglePlay() {
    const v = videoRef.current;
    if (!v) return;
    if (v.paused) {
      v.play().then(() => setPaused(false)).catch(() => {});
    } else {
      v.pause();
      setPaused(true);
    }
  }

  const arrow =
    "glass-dark absolute top-1/2 z-10 hidden h-12 w-12 -translate-y-1/2 items-center justify-center rounded-full text-2xl text-neon transition hover:bg-neon hover:text-black sm:flex";

  return (
    <div
      className="pope-popup-backdrop fixed inset-0 z-[80] flex items-center justify-center bg-black/90 backdrop-blur-sm"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
      onTouchStart={(e) => (touchY.current = e.touches[0].clientY)}
      onTouchEnd={(e) => {
        if (touchY.current === null) return;
        const dy = e.changedTouches[0].clientY - touchY.current;
        touchY.current = null;
        if (Math.abs(dy) > 70) go(dy < 0 ? 1 : -1);
      }}
    >
      <div role="dialog" aria-modal="true" aria-label={card.caption || "Video"} className="pope-popup relative h-[min(88svh,calc(100vw*16/9))] aspect-[9/16] max-w-full overflow-hidden rounded-3xl border border-white/15 bg-black shadow-2xl">
        <video
          key={card.src}
          ref={videoRef}
          src={card.src}
          playsInline
          preload="auto"
          onClick={togglePlay}
          onTimeUpdate={(e) => {
            const v = e.currentTarget;
            setProgress(v.duration ? v.currentTime / v.duration : 0);
          }}
          onEnded={() => (cards.length > 1 ? go(1) : setPaused(true))}
          className="pope-player-video h-full w-full cursor-pointer object-cover"
        />

        {paused && (
          <button
            type="button"
            onClick={togglePlay}
            aria-label="Reproducir"
            className="glass-neon absolute left-1/2 top-1/2 flex h-16 w-16 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full text-black"
          >
            <PlayIcon className="h-7 w-7" />
          </button>
        )}

        <div className="pointer-events-none absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/85 via-black/40 to-transparent px-4 pb-6 pt-16">
          {card.tag && (
            <span className="glass-neon mb-2 inline-block rounded-full px-3 py-0.5 font-display text-lg font-bold uppercase leading-none tracking-wide text-black">
              {card.tag}
            </span>
          )}
          {card.caption && <p className="font-display text-3xl font-bold uppercase leading-none text-white">{card.caption}</p>}
        </div>

        <div className="absolute inset-x-0 bottom-0 h-1 bg-white/20" aria-hidden="true">
          <div className="h-full bg-neon" style={{ width: `${progress * 100}%` }} />
        </div>

        <button
          type="button"
          onClick={onClose}
          aria-label="Cerrar"
          className="absolute right-3 top-3 z-10 flex h-11 w-11 items-center justify-center rounded-full bg-black/60 text-white transition hover:bg-neon hover:text-black"
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.2} strokeLinecap="round" className="h-5 w-5" aria-hidden="true">
            <path d="M6 6l12 12M18 6L6 18" />
          </svg>
        </button>

        <button
          type="button"
          onClick={() => {
            const v = videoRef.current;
            if (!v) return;
            v.muted = !v.muted;
            setMuted(v.muted);
          }}
          aria-label={muted ? "Activar sonido" : "Silenciar"}
          className="absolute left-3 top-3 z-10 flex h-11 items-center gap-1.5 rounded-full bg-black/60 px-3 text-xs font-bold uppercase tracking-wide text-white transition hover:bg-neon hover:text-black"
        >
          {muted ? "Sin sonido" : "Sonido"}
        </button>
      </div>

      {cards.length > 1 && (
        <>
          <button type="button" onClick={() => go(-1)} aria-label="Video anterior" className={`${arrow} left-[max(1rem,calc(50%-15.5rem))]`}>
            ‹
          </button>
          <button type="button" onClick={() => go(1)} aria-label="Video siguiente" className={`${arrow} right-[max(1rem,calc(50%-15.5rem))]`}>
            ›
          </button>
        </>
      )}
    </div>
  );
}

// Vertical videos of finished garments as a row of cards: the one you point at (or tap) opens
// up, playing its video, while the others fold into slim strips. Tapping the open card plays it
// full screen with sound. Nothing is shown until the owner uploads a video (edit mode →
// «Imágenes y contacto»).
export default function RealVideos() {
  const { editMode } = useEditMode();
  const texts = useSiteTexts();
  const [active, setActive] = useState(0);
  const [open, setOpen] = useState<number | null>(null);
  const [inView, setInView] = useState(false);
  // The videos are big: nothing is downloaded until the section is about to be reached, and on
  // low-power phones only the open card loads (the rest stay as dark strips until opened).
  const [near, setNear] = useState(false);
  const [lite, setLite] = useState(false);
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
  const close = useCallback(() => setOpen(null), []);
  const hasVideos = all.length > 0;
  const current = Math.min(active, Math.max(0, cards.length - 1));

  useEffect(() => {
    setReduceMotion(window.matchMedia("(prefers-reduced-motion: reduce)").matches);
    setLite(document.documentElement.hasAttribute("data-lite"));
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

  // Only the open card plays (muted, looping) and only while the section is on screen —
  // the other strips stay on their first frame, which keeps phones light. This is the point of
  // the section, so it also plays with "reduce motion" on (a single small muted video).
  useEffect(() => {
    cards.forEach((_, i) => {
      const v = videoRefs.current[i];
      if (!v) return;
      if (i === current && inView && open === null && !lite) {
        v.play().then(() => setBlocked(false)).catch(() => setBlocked(true));
      } else v.pause();
    });
  }, [cards, current, inView, open, lite]);

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
                  if (on) {
                    setOpen(i);
                    return;
                  }
                  source.current = "tap";
                  setActive(i);
                  setBlocked(false);
                  const v = videoRefs.current[i];
                  if (v) {
                    v.muted = true;
                    v.play().catch(() => setBlocked(true));
                  }
                }}
                aria-label={`${on ? "Ver con sonido" : "Abrir"}${c.caption ? `: ${c.caption}` : ""}`}
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
                  preload={lite ? (on ? "metadata" : "none") : on ? "auto" : "metadata"}
                  tabIndex={-1}
                  aria-hidden="true"
                  className={`pointer-events-none h-full w-full transform-gpu object-cover transition-transform duration-[900ms] ease-out ${
                    on ? "scale-100" : "scale-[1.12]"
                  }`}
                />
                <span className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/90 via-black/5 to-black/35" />
                <span
                  className={`pointer-events-none absolute inset-0 bg-black transition-opacity duration-700 ${on ? "opacity-0" : "opacity-45 group-hover:opacity-20"}`}
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

                {/* Open card: chip, title and the invitation to play with sound (fade in once open, out at once) */}
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
                    <span className="glass-dark inline-flex w-fit items-center gap-2 rounded-full py-1.5 pl-2 pr-4 text-xs font-bold uppercase tracking-wide text-white transition group-hover:bg-neon group-hover:text-black">
                      <span className="flex h-7 w-7 items-center justify-center rounded-full bg-neon text-black">
                        <PlayIcon className="h-3.5 w-3.5" />
                      </span>
                      Ver con sonido
                    </span>
                  </span>
                </span>
              </button>
            </li>
          );
        })}
      </ul>

      {open !== null && cards[open] && <Player cards={cards} index={open} onIndex={setOpen} onClose={close} />}
    </section>
  );
}
