"use client";

import Link from "next/link";
import Txt from "@/components/edit/Txt";

const STEPS = ["home.step1", "home.step2", "home.step3"];

// The neon strip right under the cover: POPE's three steps to a garment of your own, the whole strip a way into the
// editor. It is the first thing that says "you can customize anything here".
export default function HomeSteps({ editorHref }: { editorHref: string }) {
  return (
    <section aria-label="Cómo personalizar" data-tone="neon" className="bg-neon text-black">
      <Link href={editorHref} className="group mx-auto flex max-w-6xl flex-col gap-3 px-4 py-3.5 sm:px-6 md:flex-row md:items-center md:justify-between md:gap-6 md:py-4">
        <ol className="grid grid-cols-3 gap-2 md:flex md:items-center md:gap-0">
          {STEPS.map((k, n) => (
            <li key={k} className="flex items-center gap-2 md:gap-3">
              <span className="font-display text-2xl font-bold leading-none md:text-4xl">{String(n + 1).padStart(2, "0")}</span>
              <Txt k={k} className="text-[11px] font-bold uppercase leading-tight tracking-wide md:text-sm" />
              {n < STEPS.length - 1 && (
                <span aria-hidden="true" className="mx-5 hidden h-px w-10 bg-black/40 md:block lg:w-16" />
              )}
            </li>
          ))}
        </ol>
        <span className="inline-flex min-h-10 shrink-0 items-center justify-center gap-2 rounded-md bg-black px-5 font-display text-lg font-bold uppercase leading-none text-neon transition group-hover:bg-neutral-900 md:text-xl">
          <Txt k="home.stepsCta" />
          <span aria-hidden="true" className="transition-transform duration-300 group-hover:translate-x-1">→</span>
        </span>
      </Link>
    </section>
  );
}
