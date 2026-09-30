import IntroSplash from "@/components/preview/IntroSplash";
import RevealStage from "@/components/preview/RevealStage";
import HeroHeadline from "@/components/preview/HeroHeadline";
import EditableLink from "@/components/edit/EditableLink";
import Txt from "@/components/edit/Txt";
import HeroSignature from "@/components/preview/HeroSignature";

export default function PopeHero({ editorHref, cyberActive = false }: { editorHref: string; cyberActive?: boolean }) {
  return (
    <>
      <IntroSplash />

      <section className="relative isolate overflow-hidden bg-black">
        {/* Cyber campaign photo, behind the whole hero (headline + hoodie), not just one side — the
            owner wants it as one full backdrop, not confined behind a single column. Dimmed and
            darkened toward the left so the headline stays readable; auto-hides with the rest of the
            campaign the moment isCyberActive(...) goes false. */}
        {cyberActive && (
          <div aria-hidden="true" className="pointer-events-none absolute inset-0 -z-20 overflow-hidden">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/promo/cyber-banner.webp" alt="" className="h-full w-full object-cover object-[68%_35%] opacity-55" />
            <div className="absolute inset-0 bg-gradient-to-r from-black via-black/75 to-black/35" />
            <div className="absolute inset-0 bg-black/15" />
          </div>
        )}
        {/* The usual green brand glow — dialed back while the Cyber photo is showing (full strength
            would mostly paint over it), left at full strength the rest of the year. */}
        <div
          aria-hidden="true"
          className="absolute inset-0 -z-10"
          style={{
            background:
              "radial-gradient(70% 65% at 70% 58%, color-mix(in srgb, var(--neon) 48%, #102200) 0%, color-mix(in srgb, var(--neon) 18%, #102200) 28%, #102200 45%, rgba(16,34,0,0.6) 65%, transparent 85%)",
            opacity: cyberActive ? 0.35 : 1,
          }}
        />

        <div className="mx-auto grid min-h-[calc(100svh-7rem)] max-w-6xl items-center gap-6 px-5 py-8 lg:grid-cols-2 lg:gap-10 lg:py-12">
          <div>
            <HeroHeadline />

            <div className="pope-rise mt-5" style={{ animationDelay: "1.7s" }}>
              <Txt k="hero.subtext" as="p" multiline className="block max-w-md text-lg text-neutral-200 sm:text-xl" />
            </div>
            <div className="pope-rise mt-2" style={{ animationDelay: "1.85s" }}>
              <Txt k="hero.tagline" as="p" className="block font-script text-3xl text-neon" />
            </div>

            <div className="pope-rise mt-7" style={{ animationDelay: "2s" }}>
              <EditableLink href={editorHref} className="pope-cta text-black">
                <span className="pope-cta-goo" aria-hidden="true">
                  <span className="pope-cta-bg" />
                  <span className="pope-cta-drop" />
                </span>
                <Txt
                  k="hero.cta"
                  className="pope-cta-label whitespace-nowrap px-6 py-3 font-display text-3xl font-bold uppercase leading-none tracking-wide sm:px-8 sm:text-4xl"
                />
                <span className="pope-cta-circle" aria-hidden="true">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.2} className="h-5 w-5">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 12h14M13 6l6 6-6 6" />
                  </svg>
                </span>
              </EditableLink>
            </div>
          </div>

          <div className="pope-rise relative" style={{ animationDelay: "1s" }}>
            <HeroSignature />
            <div className="relative z-10">
              <RevealStage alt="Polerón POPE" />
            </div>
            <Txt k="hero.disclaimer" as="p" className="mt-2 block text-center text-sm text-neutral-400" />
          </div>
        </div>
      </section>
    </>
  );
}
