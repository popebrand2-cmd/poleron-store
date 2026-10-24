"use client";

import Link from "next/link";
import Txt from "@/components/edit/Txt";
import { useSiteImage } from "@/components/SiteContentProvider";

// The home page cover: a street photo on the left that melts into black, the headline and two ways in on the right —
// "Personaliza la tuya" first (customizing is what POPE is about), then "Ver colecciones".
// On a phone the photo fills the block and the text sits over its right half. Photo and texts are editable in place.
export default function HomeHero({ editorHref }: { editorHref: string }) {
  const photo = useSiteImage("image.homeHero");
  return (
    <section aria-label="Viste lo que te mueve" data-tone="dark" className="relative overflow-hidden bg-black">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={photo}
        alt="Cliente con una polera POPE en Santiago"
        fetchPriority="high"
        className="home-hero-photo absolute inset-0 h-full w-full object-cover object-[28%_center] md:right-auto md:w-[68%] md:object-center md:[mask-image:linear-gradient(to_right,black_60%,transparent)]"
      />
      {/* Phone: the right half darkens under the text. Computer: the photo's right edge fades into the black (mask). */}
      <span aria-hidden="true" className="absolute inset-0 bg-gradient-to-r from-transparent via-black/45 to-black/90 md:hidden" />

      {/* On a phone the floating "Exclusive" button (ExclusiveDrop, html[data-excl]) sits over the top of the cover: the text starts below it. */}
      <div className="relative mx-auto flex min-h-[250px] max-w-6xl items-center justify-end px-4 py-8 max-md:[html[data-excl]_&]:pt-24 sm:min-h-[320px] md:min-h-[360px] md:px-6 md:py-12 lg:min-h-[400px]">
        <div className="w-[60%] md:w-[44%]">
          <h1 className="home-rise font-display text-[2.2rem] font-bold uppercase leading-[0.86] text-white sm:text-5xl lg:text-[5rem]">
            <Txt k="home.heroTitle1" className="block" />
            <Txt k="home.heroTitle2" className="pope-headline-glow block text-neon" />
          </h1>
          <Txt k="home.heroText" as="p" multiline className="home-rise mt-3 block max-w-sm [--d:120ms] text-xs leading-snug text-white sm:text-base md:mt-4 md:text-xl" />
          <div className="mt-4 flex flex-col items-stretch gap-2 sm:flex-row sm:flex-wrap sm:items-center sm:gap-3 md:mt-6">
            <Link
              href={editorHref}
              className="home-rise home-cta-glow group inline-flex min-h-10 w-full items-center justify-center gap-2 whitespace-nowrap rounded-md bg-neon px-3 font-display text-base sm:w-auto sm:px-4 sm:text-lg font-bold uppercase leading-none text-black transition [--d:240ms] hover:brightness-95 active:scale-[0.98] md:min-h-12 md:gap-2 md:px-5 md:text-xl xl:min-h-14 xl:text-2xl"
            >
              <svg aria-hidden="true" viewBox="0 0 24 24" className="h-4 w-4 shrink-0 md:h-5 md:w-5" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round">
                <path d="M12 20h9" />
                <path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4Z" />
              </svg>
              <Txt k="home.heroCustomize" />
            </Link>
            <Link
              href="/colecciones"
              className="home-rise group inline-flex min-h-10 w-full items-center justify-center gap-2 whitespace-nowrap rounded-md border-2 border-white/80 px-3 font-display text-base sm:w-auto sm:px-4 sm:text-lg font-bold uppercase leading-none text-white transition [--d:320ms] hover:border-neon hover:text-neon md:min-h-12 md:gap-2 md:px-5 md:text-xl xl:min-h-14 xl:text-2xl"
            >
              <Txt k="home.heroCta" />
              <span aria-hidden="true" className="transition-transform duration-300 group-hover:translate-x-1">→</span>
            </Link>
          </div>
          <ul className="home-rise mt-5 hidden flex-wrap gap-x-5 gap-y-1.5 text-xs font-medium text-white/80 [--d:400ms] sm:flex md:text-sm">
            {["Envío a todo Chile", "Pago seguro con Mercado Pago", "Ves tu diseño antes de pagar"].map((t) => (
              <li key={t} className="flex items-center gap-1.5">
                <svg aria-hidden="true" viewBox="0 0 24 24" className="h-4 w-4 text-neon" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M5 12l5 5L20 7" />
                </svg>
                {t}
              </li>
            ))}
          </ul>
        </div>
      </div>
    </section>
  );
}
