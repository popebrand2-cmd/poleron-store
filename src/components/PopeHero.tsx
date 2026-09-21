import IntroSplash from "@/components/preview/IntroSplash";
import RevealStage from "@/components/preview/RevealStage";
import HeroHeadline from "@/components/preview/HeroHeadline";
import EditableLink from "@/components/edit/EditableLink";
import Txt from "@/components/edit/Txt";
import HeroSignature from "@/components/preview/HeroSignature";

export default function PopeHero({ editorHref }: { editorHref: string }) {
  return (
    <>
      <IntroSplash />

      <section className="relative isolate overflow-hidden bg-black">
        <div
          aria-hidden="true"
          className="absolute inset-0 -z-10"
          style={{ background: "radial-gradient(60% 55% at 70% 58%, #102200 0%, rgba(16,34,0,0.35) 45%, transparent 75%)" }}
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
