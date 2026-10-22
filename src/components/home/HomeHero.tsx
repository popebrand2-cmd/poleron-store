"use client";

import Link from "next/link";
import Txt from "@/components/edit/Txt";
import { useSiteImage } from "@/components/SiteContentProvider";

// The home page cover: a street photo on the left that melts into black, the headline and "Ver colecciones" on the right.
// On a phone the photo fills the block and the text sits over its right half. Photo and texts are editable in place.
export default function HomeHero() {
  const photo = useSiteImage("image.homeHero");
  return (
    <section aria-label="Viste lo que te mueve" className="relative overflow-hidden bg-black">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={photo}
        alt="Cliente con una polera POPE en Santiago"
        fetchPriority="high"
        className="home-hero-photo absolute inset-0 h-full w-full object-cover object-[28%_center] md:right-auto md:w-[68%] md:object-center md:[mask-image:linear-gradient(to_right,black_60%,transparent)]"
      />
      {/* Phone: the right half darkens under the text. Computer: the photo's right edge fades into the black (mask). */}
      <span aria-hidden="true" className="absolute inset-0 bg-gradient-to-r from-transparent via-black/45 to-black/90 md:hidden" />

      <div className="relative mx-auto flex min-h-[250px] max-w-6xl items-center justify-end px-4 py-8 sm:min-h-[320px] md:min-h-[360px] md:px-6 md:py-12 lg:min-h-[400px]">
        <div className="w-[60%] md:w-[42%]">
          <h1 className="home-rise font-display text-[2.2rem] font-bold uppercase leading-[0.86] text-white sm:text-5xl lg:text-[5rem]">
            <Txt k="home.heroTitle1" className="block" />
            <Txt k="home.heroTitle2" className="pope-headline-glow block text-neon" />
          </h1>
          <Txt k="home.heroText" as="p" multiline className="home-rise mt-3 block max-w-sm [--d:120ms] text-xs leading-snug text-white sm:text-base md:mt-4 md:text-xl" />
          <Link
            href="/colecciones"
            className="home-rise home-cta-glow group mt-4 inline-flex min-h-10 items-center gap-2 rounded-md bg-neon [--d:240ms] px-4 font-display text-lg font-bold uppercase leading-none text-black transition hover:brightness-95 active:scale-[0.98] md:mt-6 md:min-h-14 md:gap-3 md:px-7 md:text-2xl"
          >
            <Txt k="home.heroCta" />
            <span aria-hidden="true" className="transition-transform duration-300 group-hover:translate-x-1">→</span>
          </Link>
        </div>
      </div>
    </section>
  );
}
