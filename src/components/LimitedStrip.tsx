"use client";

import { Countdown } from "@/components/LimitedEditionCard";

// The strip on top of a limited-edition product page: units left and the closing countdown.
export default function LimitedStrip({ remaining, units, until, soldOut, closed }: { remaining: number | null; units: number; until: string | null; soldOut: boolean; closed: boolean }) {
  const over = soldOut || closed;
  return (
    <div role="status" className={`mb-5 flex flex-wrap items-center gap-x-4 gap-y-1 rounded-xl px-4 py-3 text-sm font-bold uppercase tracking-wide ${over ? "bg-neutral-200 text-neutral-600" : "bg-black text-white"}`}>
      <span className={`rounded-full px-3 py-1 text-[11px] tracking-[0.18em] ${over ? "bg-neutral-500 text-white" : "bg-red-600 text-white"}`}>Edición limitada</span>
      {soldOut && <span>Agotada</span>}
      {closed && !soldOut && <span>La venta ya cerró</span>}
      {!over && units > 0 && remaining != null && <span className="text-neon">Quedan {remaining} de {units}</span>}
      {!over && until && (
        <span>
          Cierra en <Countdown untilIso={until} className="font-display text-lg text-white" />
        </span>
      )}
    </div>
  );
}
