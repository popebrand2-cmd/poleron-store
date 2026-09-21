"use client";

import { useEffect, useState } from "react";

const MESSAGES = [
  "📦 ENVÍO GRATIS SOBRE $70.000 EN LA REGIÓN METROPOLITANA",
  "🎨 SUBE TU PROPIO DISEÑO Y VE EL MOCKUP REAL ANTES DE COMPRAR",
  "🧵 CADA PRENDA ES UNA EDICIÓN DE UNA SOLA PERSONA: TÚ",
];

const INTERVAL_MS = 5000;

export default function AnnouncementBar() {
  const [index, setIndex] = useState(0);

  useEffect(() => {
    const id = setInterval(() => setIndex((i) => (i + 1) % MESSAGES.length), INTERVAL_MS);
    return () => clearInterval(id);
  }, []);

  function prev() {
    setIndex((i) => (i - 1 + MESSAGES.length) % MESSAGES.length);
  }
  function next() {
    setIndex((i) => (i + 1) % MESSAGES.length);
  }

  return (
    <div className="flex h-9 items-center justify-center gap-3 bg-black/90 backdrop-blur-md px-4 text-[11px] font-semibold tracking-wide text-white sm:text-xs">
      <button
        type="button"
        onClick={prev}
        aria-label="Mensaje anterior"
        className="shrink-0 text-neutral-400 hover:text-white"
      >
        ‹
      </button>
      <p className="truncate text-center">{MESSAGES[index]}</p>
      <button
        type="button"
        onClick={next}
        aria-label="Siguiente mensaje"
        className="shrink-0 text-neutral-400 hover:text-white"
      >
        ›
      </button>
    </div>
  );
}
