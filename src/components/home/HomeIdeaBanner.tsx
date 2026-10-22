"use client";

import Link from "next/link";
import Txt from "@/components/edit/Txt";
import { useSiteImage } from "@/components/SiteContentProvider";

// "¿Tienes otra idea?": the way into the editor, after the collections. On a computer a photo on the left fades into the
// black; on a phone only the text and a full-width button.
export default function HomeIdeaBanner({ editorHref }: { editorHref: string }) {
  const photo = useSiteImage("image.homeIdea");
  return (
    <section aria-label="Personaliza tu prenda" className="relative overflow-hidden bg-black">
      {photo && (
        <>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={photo} alt="" loading="lazy" decoding="async" className="absolute inset-y-0 left-0 hidden h-full w-[30%] object-cover [mask-image:linear-gradient(to_right,black_55%,transparent)] md:block" />
        </>
      )}
      <div className="relative mx-auto flex max-w-6xl flex-col items-center gap-4 px-4 py-7 text-center md:flex-row md:justify-between md:gap-8 md:py-7 md:pl-[27%] md:pr-6 md:text-left">
        <div>
          <h2 className="font-display text-4xl font-bold uppercase leading-none text-white sm:text-5xl md:whitespace-nowrap md:text-[2.6rem] lg:text-5xl">
            <Txt k="home.ideaTitle1" /> <Txt k="home.ideaTitle2" className="text-neon" />
          </h2>
          <Txt k="home.ideaText" as="p" multiline className="mt-1 block text-sm text-white sm:text-base md:text-lg" />
        </div>
        <Link
          href={editorHref}
          className="home-cta-glow group flex min-h-12 w-full shrink-0 items-center justify-center gap-3 rounded-md bg-neon px-6 font-display text-xl font-bold uppercase leading-none text-black transition hover:brightness-95 active:scale-[0.98] sm:w-auto md:min-h-14 md:px-7 md:text-2xl"
        >
          <Txt k="home.ideaCta" />
          <span aria-hidden="true" className="transition-transform duration-300 group-hover:translate-x-1">→</span>
        </Link>
      </div>
    </section>
  );
}
