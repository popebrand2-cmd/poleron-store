"use client";

import { useEffect, useRef, type CSSProperties, type ReactNode } from "react";
import { useHoodieColor, type HoodieColor } from "@/lib/hoodie-color";
import { CHEST } from "@/lib/hoodie-stage";
import EditableLink from "@/components/edit/EditableLink";
import Txt from "@/components/edit/Txt";
import { useEditMode } from "@/components/edit/EditModeContext";
import { useSiteImage } from "@/components/SiteContentProvider";

const Svg = ({ children, className }: { children: ReactNode; className?: string }) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden="true">
    {children}
  </svg>
);

const UploadIcon = ({ className }: { className?: string }) => (
  <Svg className={className}>
    <path d="M12 16V4M7 9l5-5 5 5M4 16v3a1 1 0 001 1h14a1 1 0 001-1v-3" />
  </Svg>
);
const SizeIcon = ({ className }: { className?: string }) => (
  <Svg className={className}>
    <path d="M14 4h6v6M10 20H4v-6M20 4l-7 7M4 20l7-7" />
  </Svg>
);
const MoveIcon = ({ className }: { className?: string }) => (
  <Svg className={className}>
    <path d="M12 3v18M3 12h18M12 3l-3 3M12 3l3 3M12 21l-3-3M12 21l3-3M3 12l3-3M3 12l3 3M21 12l-3-3M21 12l-3 3" />
  </Svg>
);
const CheckIcon = ({ className }: { className?: string }) => (
  <Svg className={className}>
    <path d="M5 12.5l4.5 4.5L19 7.5" />
  </Svg>
);
const ShirtIcon = ({ className }: { className?: string }) => (
  <Svg className={className}>
    <path d="M8 3L3 6l2 4 3-1v11h8V9l3 1 2-4-5-3a4 4 0 01-8 0z" />
  </Svg>
);

function Connector({ index }: { index: number }) {
  return (
    <div data-hiw className="hiw-conn flex items-center justify-center" style={{ transitionDelay: `${index * 0.1}s` }}>
      {/* desktop: horizontal arrow */}
      <svg viewBox="0 0 64 24" className="hidden h-6 w-12 text-neon lg:block" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <path className="hiw-arrow-path" pathLength={100} d="M3 12h50" />
        <path className="hiw-arrow-head" d="M47 5l10 7-10 7" />
      </svg>
      {/* mobile: vertical progress line */}
      <div className="flex flex-col items-center lg:hidden" aria-hidden="true">
        <div className="hiw-vline h-12 w-0.5 [background:linear-gradient(to_bottom,transparent,var(--neon))]" />
        <svg viewBox="0 0 24 24" className="-mt-1 h-5 w-5 text-neon" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round">
          <path d="M6 9l6 7 6-7" />
        </svg>
      </div>
    </div>
  );
}

function StepHead({ n, labelKey, icon, main }: { n: string; labelKey: string; icon: ReactNode; main?: boolean }) {
  return (
    <div className="flex items-start justify-between gap-3">
      <div>
        <span className="block font-display text-7xl font-bold leading-[0.8] text-neon sm:text-8xl">{n}</span>
        <span className="mt-2 inline-block rounded-full border border-white/15 px-3 py-0.5 font-display text-xl uppercase tracking-widest text-neutral-200">
          <Txt k={labelKey} />
        </span>
      </div>
      <span className={`hiw-ico glass-neon flex items-center justify-center rounded-full text-black ${main ? "h-14 w-14" : "h-12 w-12"}`}>{icon}</span>
    </div>
  );
}

function StepText({ titleKey, textKey }: { titleKey: string; textKey: string }) {
  return (
    <div className="mt-5">
      <Txt k={titleKey} as="h3" className="block font-display text-4xl font-bold uppercase leading-none text-white sm:text-5xl" />
      <Txt k={textKey} as="p" multiline className="mt-2 block text-lg leading-snug text-neutral-300" />
    </div>
  );
}

// The garment with the design on the chest — identical in steps 2 and 3.
function Garment({ color, children, design }: { color: HoodieColor; children?: ReactNode; design: ReactNode }) {
  const HOODIE: Record<HoodieColor, string> = { negro: useSiteImage("image.hoodieBlack"), blanco: useSiteImage("image.hoodieWhite") };
  return (
    <div className="relative aspect-[1200/990] w-full">
      {(Object.keys(HOODIE) as HoodieColor[]).map((c) => (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          key={c}
          src={HOODIE[c]}
          alt=""
          width={1200}
          height={990}
          loading="lazy"
          decoding="async"
          draggable={false}
          className={`hiw-hoodie absolute inset-0 h-full w-full object-contain transition-opacity duration-500 ${c === color ? "opacity-100" : "opacity-0"}`}
        />
      ))}
      <div className="absolute" style={CHEST}>
        {design}
      </div>
      {children}
    </div>
  );
}

// The design: neon on the black hoodie, black on the white one.
function DesignImg({ color }: { color: HoodieColor }) {
  const DESIGN_BY_COLOR: Record<HoodieColor, string> = { negro: useSiteImage("image.designOnBlack"), blanco: useSiteImage("image.designOnWhite") };
  return (
    <>
      {(Object.keys(DESIGN_BY_COLOR) as HoodieColor[]).map((c) => (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          key={c}
          src={DESIGN_BY_COLOR[c]}
          alt=""
          loading="lazy"
          decoding="async"
          draggable={false}
          className={`absolute inset-0 h-full w-full object-contain transition-opacity duration-500 ${c === color ? "opacity-100" : "opacity-0"}`}
        />
      ))}
    </>
  );
}

export default function HowItWorks({ editorHref }: { editorHref: string }) {
  const rootRef = useRef<HTMLDivElement>(null);
  const color = useHoodieColor();
  const { editMode } = useEditMode();
  const pe = editMode ? "" : "pointer-events-none";
  const phoneDesign = useSiteImage("image.designOnBlack");
  const ink = color === "blanco" ? "#102200" : "var(--neon)";

  useEffect(() => {
    const root = rootRef.current;
    if (!root) return;
    const items = Array.from(root.querySelectorAll<HTMLElement>("[data-hiw]"));
    if (!("IntersectionObserver" in window)) {
      items.forEach((el) => el.classList.add("is-in"));
      return;
    }
    root.classList.add("hiw-armed");
    const io = new IntersectionObserver(
      (entries) => {
        for (const e of entries) {
          if (e.isIntersecting) {
            e.target.classList.add("is-in");
            io.unobserve(e.target);
          }
        }
      },
      { threshold: 0.2, rootMargin: "0px 0px -6% 0px" },
    );
    items.forEach((el) => io.observe(el));
    return () => io.disconnect();
  }, []);

  const delay = (i: number): CSSProperties => ({ transitionDelay: `${i * 0.12}s` });

  return (
    <section ref={rootRef} className="relative isolate overflow-hidden border-t border-neutral-800 bg-black">
      <div aria-hidden="true" className="hiw-texture absolute inset-0 -z-10" />
      <div
        aria-hidden="true"
        className="absolute inset-0 -z-10"
        style={{ background: "radial-gradient(45% 40% at 50% 55%, color-mix(in srgb, var(--neon) 9%, transparent), transparent 70%)" }}
      />

      <div className="mx-auto max-w-7xl px-5 py-16 sm:py-24">
        <div data-hiw className="hiw-reveal mb-12 text-center sm:mb-16">
          <Txt k="how.title" as="h2" className="block font-display text-[4.5rem] font-bold uppercase leading-[0.85] text-white sm:text-[7rem]" />
          <Txt k="how.subtitle" as="p" className="-mt-1 block font-script text-4xl text-neon sm:text-5xl" />
        </div>

        <div className="flex flex-col gap-0 lg:grid lg:grid-cols-[1fr_auto_1.3fr_auto_1fr] lg:items-center lg:gap-2">
          {/* 01 — Sube tu diseño */}
          <div data-hiw className="hiw-reveal mx-auto w-full max-w-[30rem] lg:max-w-none" style={delay(0)}>
            <article className="hiw-card rounded-3xl p-5 sm:p-6">
              <StepHead n="01" labelKey="how.tag1" icon={<UploadIcon className="h-6 w-6" />} />

              <div className="hiw-scene relative mt-4 flex aspect-[1200/990] w-full items-center justify-center overflow-hidden rounded-2xl bg-black/50">
                {/* phone */}
                <div className="relative h-[90%] aspect-[9/17] rounded-[1.5rem] border-2 border-white/25 bg-neutral-950 p-2 shadow-[0_0_30px_-8px_color-mix(in_srgb,var(--neon)_50%,transparent)]">
                  <span className="absolute left-1/2 top-1.5 h-1 w-8 -translate-x-1/2 rounded-full bg-white/20" aria-hidden="true" />
                  <div className="mt-3 flex h-[calc(100%-1.4rem)] flex-col justify-between rounded-[1rem] bg-neutral-900 p-2">
                    <Txt k="how.phone" as="p" className="block whitespace-nowrap font-display text-base uppercase leading-none tracking-wide text-white" />
                    <div className="relative flex flex-1 items-center justify-center rounded-lg border border-dashed [border-color:color-mix(in_srgb,var(--neon)_70%,transparent)] my-1.5">
                      <UploadIcon className="hiw-drop h-7 w-7 text-neon" />
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={phoneDesign} alt="" loading="lazy" decoding="async" draggable={false} className="hiw-loaded absolute inset-1 m-auto h-[80%] w-[80%] object-contain" />
                    </div>
                    <div className="h-1.5 overflow-hidden rounded-full bg-white/15">
                      <div className="hiw-bar h-full w-full rounded-full bg-neon" />
                    </div>
                  </div>
                </div>

                {/* file flying into the phone */}
                <span className="hiw-file glass-dark pointer-events-none absolute left-1/2 top-[36%] z-10 flex -translate-x-1/2 items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-sm font-semibold text-white">
                  <span className="h-4 w-4 rounded-sm bg-neon" aria-hidden="true" />
                  mi-diseño.png
                </span>

                {/* accepted formats */}
                <ul className={`${pe} absolute inset-y-0 left-2 flex flex-col justify-center gap-3 sm:left-3`} aria-label="Puedes subir">
                  {["how.fmt1", "how.fmt2"].map((k) => (
                    <li key={k} className="glass-dark rounded-full px-2.5 py-1 text-sm font-semibold uppercase tracking-wide text-white">
                      <Txt k={k} />
                    </li>
                  ))}
                </ul>
                <ul className={`${pe} absolute inset-y-0 right-2 flex flex-col justify-center gap-3 sm:right-3`}>
                  {["how.fmt3", "how.fmt4"].map((k) => (
                    <li key={k} className="glass-dark rounded-full px-2.5 py-1 text-sm font-semibold uppercase tracking-wide text-white">
                      <Txt k={k} />
                    </li>
                  ))}
                </ul>
              </div>

              <StepText titleKey="how.title1" textKey="how.text1" />
            </article>
          </div>

          <Connector index={1} />

          {/* 02 — Personaliza en vivo (main card) */}
          <div data-hiw className="hiw-reveal mx-auto w-full max-w-[30rem] lg:max-w-none" style={delay(1)}>
            <article className="hiw-card hiw-card-main rounded-3xl p-5 sm:p-7 lg:py-8">
              <StepHead n="02" labelKey="how.tag2" icon={<SizeIcon className="h-7 w-7" />} main />

              <div className="hiw-scene relative -mx-3 mt-4 overflow-hidden rounded-2xl sm:mx-0 bg-[radial-gradient(60%_60%_at_50%_45%,color-mix(in_srgb,var(--neon)_16%,transparent),transparent_75%)] bg-black/60">
                <Garment
                  color={color}
                  design={
                    <div className="hiw-adjust relative h-full w-full">
                      <DesignImg color={color} />
                      {/* selection frame + corner handles */}
                      <div className="absolute -inset-[7%] border border-dashed" style={{ borderColor: ink }} aria-hidden="true">
                        {["-left-1.5 -top-1.5", "-right-1.5 -top-1.5", "-bottom-1.5 -left-1.5", "-bottom-1.5 -right-1.5"].map((p) => (
                          <span key={p} className={`hiw-handle absolute h-3 w-3 rounded-[3px] border border-[#102200] bg-neon ${p}`} />
                        ))}
                      </div>
                    </div>
                  }
                >
                  {/* alignment guides */}
                  <div aria-hidden="true" className="hiw-guides pointer-events-none absolute inset-0">
                    <span className="absolute inset-x-[6%] h-px " style={{ top: "41.25%", background: color === "blanco" ? "rgba(16,34,0,0.5)" : "color-mix(in srgb, var(--neon) 45%, transparent)" }} />
                    <span className="absolute inset-y-[4%] w-px " style={{ left: "50.6%", background: color === "blanco" ? "rgba(16,34,0,0.5)" : "color-mix(in srgb, var(--neon) 45%, transparent)" }} />
                  </div>

                  {/* floating controls (visual only) */}
                  <div aria-hidden="true" className="hiw-float glass-dark absolute left-[3%] top-[14%] flex items-center gap-1.5 rounded-full px-3 py-1.5 text-sm font-semibold uppercase tracking-wide text-white">
                    <SizeIcon className="h-4 w-4 text-neon" />
                    <Txt k="how.ctlSize" />
                  </div>
                  <div aria-hidden="true" className="hiw-float glass-dark absolute bottom-[12%] right-[3%] flex items-center gap-1.5 rounded-full px-3 py-1.5 text-sm font-semibold uppercase tracking-wide text-white" style={{ animationDelay: "-1.7s" }}>
                    <MoveIcon className="h-4 w-4 text-neon" />
                    <Txt k="how.ctlPos" />
                  </div>
                </Garment>
              </div>

              <StepText titleKey="how.title2" textKey="how.text2" />
            </article>
          </div>

          <Connector index={2} />

          {/* 03 — Lo hacemos realidad */}
          <div data-hiw className="hiw-reveal mx-auto w-full max-w-[30rem] lg:max-w-none" style={delay(2)}>
            <article className="hiw-card rounded-3xl p-5 sm:p-6">
              <StepHead n="03" labelKey="how.tag3" icon={<ShirtIcon className="h-6 w-6" />} />

              <div className="hiw-scene relative -mx-2 mt-4 overflow-hidden rounded-2xl sm:mx-0 bg-[radial-gradient(55%_55%_at_50%_50%,color-mix(in_srgb,var(--neon)_10%,transparent),transparent_75%)] bg-black/50">
                <Garment color={color} design={<DesignImg color={color} />}>
                  <div className="glass-neon absolute bottom-[10%] left-[4%] flex items-center gap-1.5 rounded-full px-3 py-1.5 text-sm font-bold uppercase tracking-wide text-black">
                    <CheckIcon className="h-4 w-4" />
                    <Txt k="how.done" />
                  </div>
                </Garment>
              </div>

              <StepText titleKey="how.title3" textKey="how.text3" />
            </article>
          </div>
        </div>

        <div data-hiw className="hiw-reveal mt-14 text-center" style={delay(1)}>
          <EditableLink href={editorHref} className="pope-cta text-black">
            <span className="pope-cta-goo" aria-hidden="true">
                  <span className="pope-cta-bg" />
                  <span className="pope-cta-drop" />
                </span>
            <Txt
              k="how.cta"
              className="pope-cta-label whitespace-nowrap px-6 py-3 font-display text-3xl font-bold uppercase leading-none tracking-wide sm:px-8 sm:text-4xl"
            />
            <span className="pope-cta-circle" aria-hidden="true">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.2} className="h-5 w-5">
                <path strokeLinecap="round" strokeLinejoin="round" d="M5 12h14M13 6l6 6-6 6" />
              </svg>
            </span>
          </EditableLink>
          <Txt k="how.disclaimer" as="p" className="mt-3 block text-sm text-neutral-400" />
        </div>
      </div>
    </section>
  );
}
