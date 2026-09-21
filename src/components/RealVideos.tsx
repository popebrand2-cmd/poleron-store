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
          className="h-full w-full cursor-pointer object-cover"
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

// Vertical videos of finished garments, laid out like a hand of cards: pick one and it opens in a
// full-screen player. Nothing is shown until the owner uploads a video (edit mode →
// «Imágenes y contacto»).
export default function RealVideos() {
  const { editMode } = useEditMode();
  const texts = useSiteTexts();
  const [filter, setFilter] = useState("");
  const [open, setOpen] = useState<number | null>(null);

  const all: Card[] = useMemo(() => {
    const out: Card[] = [];
    for (let n = 1; n <= VIDEO_SLOTS; n++) {
      const src = (texts[`video.${n}.src`] ?? "").trim();
      if (src) out.push({ n, src, tag: (texts[`video.${n}.tag`] ?? "").trim(), caption: (texts[`video.${n}.caption`] ?? "").trim() });
    }
    return out;
  }, [texts]);

  const tags = useMemo(() => Array.from(new Set(all.map((c) => c.tag).filter(Boolean))), [all]);
  const cards = filter ? all.filter((c) => c.tag === filter) : all;
  const close = useCallback(() => setOpen(null), []);

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

  const mid = (cards.length - 1) / 2;
  const fan = cards.length <= 6;

  return (
    <section className="overflow-hidden border-t border-neutral-800 bg-black">
      <div className="mx-auto max-w-6xl px-6 pb-6 pt-16">
        <div className="text-center">
          <Txt k="videos.eyebrow" as="p" className="mb-1 block font-script text-3xl text-neon" />
          <Txt k="videos.heading" as="h2" className="block text-4xl font-bold uppercase text-white sm:text-5xl" />
          <Txt k="videos.subtext" as="p" multiline className="mx-auto mt-2 block max-w-xl text-neutral-400" />
        </div>

        {tags.length > 0 && (
          <div role="tablist" aria-label="Filtrar videos" className="mt-6 flex flex-wrap justify-center gap-2">
            {["", ...tags].map((t) => {
              const on = filter === t;
              return (
                <button
                  key={t || "all"}
                  type="button"
                  role="tab"
                  aria-selected={on}
                  onClick={() => setFilter(t)}
                  className={`min-h-11 rounded-full px-5 py-2 font-display text-2xl uppercase leading-none tracking-wide transition ${
                    on ? "glass-neon text-black" : "glass-dark text-white hover:text-neon"
                  }`}
                >
                  {t || <Txt k="videos.all" />}
                </button>
              );
            })}
          </div>
        )}
      </div>

      {/* The hand of cards: a swipeable row on phones, a slightly fanned hand on wide screens */}
      <ul
        className="flex snap-x snap-mandatory gap-4 overflow-x-auto px-6 pb-12 pt-8 [scrollbar-width:none] lg:justify-center lg:gap-0 lg:overflow-visible [&::-webkit-scrollbar]:hidden"
        aria-label="Videos de prendas hechas"
      >
        {cards.map((c, i) => {
          const off = i - mid;
          return (
            <li
              key={c.n}
              className="pope-card w-[58vw] max-w-[15rem] shrink-0 snap-center sm:w-56 lg:-mx-2"
              style={
                {
                  "--r": fan ? `${off * 4}deg` : "0deg",
                  "--y": fan ? `${Math.abs(off) * 8}px` : "0px",
                } as React.CSSProperties
              }
            >
              <button
                type="button"
                onClick={() => setOpen(i)}
                aria-label={`Ver video${c.caption ? `: ${c.caption}` : ""}`}
                className="group relative block aspect-[9/16] w-full overflow-hidden rounded-3xl border border-white/15 bg-neutral-900 text-left shadow-[0_18px_40px_-18px_rgba(0,0,0,0.9)]"
              >
                <video src={`${c.src}#t=0.1`} muted playsInline preload="metadata" tabIndex={-1} aria-hidden="true" className="pointer-events-none h-full w-full object-cover" />
                <span className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/85 via-black/10 to-black/30" />
                {c.tag && (
                  <span className="glass-neon absolute left-3 top-3 rounded-full px-3 py-0.5 font-display text-lg font-bold uppercase leading-none tracking-wide text-black">
                    {c.tag}
                  </span>
                )}
                <span className="glass-dark absolute right-3 top-3 flex h-11 w-11 items-center justify-center rounded-full text-neon transition group-hover:bg-neon group-hover:text-black">
                  <PlayIcon className="h-5 w-5" />
                </span>
                {c.caption && (
                  <span className="pointer-events-none absolute inset-x-3 bottom-4 font-display text-3xl font-bold uppercase leading-none text-white">
                    {c.caption}
                  </span>
                )}
              </button>
            </li>
          );
        })}
      </ul>

      {open !== null && cards[open] && <Player cards={cards} index={open} onIndex={setOpen} onClose={close} />}
    </section>
  );
}
