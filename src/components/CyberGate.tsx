"use client";

import Txt from "@/components/edit/Txt";
import CyberCountdown from "@/components/CyberCountdown";

// The Cyber strip at the top of the homepage: a reminder with the countdown and a button down to the
// products. The prices themselves live in the hero (CyberLookbook). It used to be a full-screen intro every
// visitor had to click through before seeing the store. Auto-hides with the rest of the campaign the moment
// isCyberActive(...) goes false.
export default function CyberGate({ active }: { active: boolean }) {
  if (!active) return null;

  return (
    <section aria-label="Cyber POPE" className="border-b border-red-600/40 bg-gradient-to-r from-[#2a0606] via-black to-[#2a0606] text-white">
      <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-center gap-x-5 gap-y-2 px-4 py-2.5">
        {/* On phones the hero below carries the Cyber tag and the button, so the strip is one slim line */}
        <span className="hidden items-center gap-1.5 rounded-full bg-red-600 px-3 py-1 text-[11px] font-bold uppercase tracking-[0.2em] sm:inline-flex">
          🔥 <Txt k="cyber.badge" as="span" />
        </span>

        <p className="flex items-baseline gap-1.5 text-xs font-semibold uppercase tracking-wide text-neutral-300">
          <span className="sm:hidden" aria-hidden="true">🔥</span>
          <Txt k="cyber.endsIn" as="span" />
          <CyberCountdown className="font-display text-lg leading-none text-white" />
        </p>

        <a
          href="#tienda"
          className="hidden min-h-9 items-center gap-1.5 rounded-full bg-neon px-4 text-xs font-bold sm:inline-flex uppercase tracking-wide text-black transition hover:brightness-90"
        >
          <Txt k="cyber.stripCta" as="span" />
          <span aria-hidden="true">↓</span>
        </a>
      </div>
    </section>
  );
}
