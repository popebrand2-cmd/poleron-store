import type { Metadata } from "next";
import Link from "next/link";
import { prisma } from "@/lib/prisma";
import IntroSplash from "@/components/preview/IntroSplash";
import RevealStage from "@/components/preview/RevealStage";
import Icon from "@/components/Icon";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Vista previa — POPE",
  robots: { index: false, follow: false },
};

const STEPS = [
  {
    n: "01",
    icon: "upload",
    title: "Sube tu diseño",
    text: "Una foto, un dibujo, un logo o un texto.",
    image: "/preview/design-sample.png",
  },
  {
    n: "02",
    icon: "edit",
    title: "Personaliza en vivo",
    text: "Ajusta tu diseño y mira cómo queda en la prenda.",
    image: "/preview/hoodie-after.webp",
  },
  {
    n: "03",
    icon: "box",
    title: "Lo hacemos realidad",
    text: "Finaliza tu compra y nosotros confeccionamos tu prenda personalizada.",
    image: null,
  },
];

const VARIANTS = [
  { id: "negro", label: "Negro", swatch: "#0b0b0b", before: "/preview/hoodie-before.webp", after: "/preview/hoodie-after.webp" },
  { id: "blanco", label: "Blanco", swatch: "#f5f5f0", before: "/preview/hoodie-white-before.webp", after: "/preview/hoodie-white-after.webp" },
];

function Words({ text, start, className }: { text: string; start: number; className?: string }) {
  return (
    <>
      {text.split(" ").map((w, i) => (
        <span key={i} className={`pope-word mr-[0.22em] ${className ?? ""}`} style={{ animationDelay: `${start + i * 0.08}s` }}>
          {w}
        </span>
      ))}
    </>
  );
}

export default async function PreviewPage() {
  // The button goes to the real editor: the product page of the newest active hoodie.
  const products = await prisma.product.findMany({ where: { active: true }, orderBy: { createdAt: "desc" } });
  const hoodie = products.find((p) => /hoodie|poler[oó]n/i.test(p.name)) ?? products[0];
  const editorHref = hoodie ? `/productos/${hoodie.slug}` : "/#tienda";

  return (
    <main>
      <IntroSplash />

      <div className="bg-[#102200] px-6 py-2 text-center text-sm text-neutral-200">
        <strong className="font-bold text-neon">Vista previa</strong> · así se vería la nueva portada. Tu portada actual sigue
        activa en{" "}
        <Link href="/" className="underline underline-offset-2 hover:text-neon">
          el inicio
        </Link>
        .
      </div>

      {/* Hero */}
      <section className="relative isolate overflow-hidden bg-black">
        <div
          aria-hidden="true"
          className="absolute inset-0 -z-10"
          style={{ background: "radial-gradient(60% 55% at 70% 58%, #102200 0%, rgba(16,34,0,0.35) 45%, transparent 75%)" }}
        />

        <div className="mx-auto grid min-h-[calc(100svh-7rem)] max-w-6xl items-center gap-6 px-5 py-8 lg:grid-cols-2 lg:gap-10 lg:py-12">
          <div>
            <h1 className="font-display text-[5.2rem] font-bold uppercase leading-[0.82] text-white sm:text-[7rem] lg:text-[8.5rem]">
              <span className="block">
                <Words text="TU IDEA." start={1.1} />
              </span>
              <span className="block text-neon">
                <Words text="TU PRENDA." start={1.4} />
              </span>
            </h1>

            <p className="pope-rise mt-5 max-w-md text-lg text-neutral-200 sm:text-xl" style={{ animationDelay: "1.7s" }}>
              Personaliza tu ropa y mira cómo queda antes de comprar.
            </p>
            <p className="pope-rise mt-2 font-script text-3xl text-neon" style={{ animationDelay: "1.85s" }}>
              Tu idea, tu estilo, tu esencia.
            </p>

            <div className="pope-rise mt-7" style={{ animationDelay: "2s" }}>
              <Link href={editorHref} className="pope-cta text-black">
                <span className="pope-cta-bg" />
                <span className="relative z-10 whitespace-nowrap px-6 py-3 font-display text-3xl font-bold uppercase leading-none tracking-wide sm:px-8 sm:text-4xl">
                  Diseña la tuya
                </span>
                <span className="pope-cta-circle" aria-hidden="true">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.2} className="h-5 w-5">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 12h14M13 6l6 6-6 6" />
                  </svg>
                </span>
              </Link>
            </div>
          </div>

          <div className="pope-rise relative" style={{ animationDelay: "1s" }}>
            {/* POPE signature behind the garment */}
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="/brand/pope-logo.png"
              alt=""
              aria-hidden="true"
              draggable={false}
              className="pointer-events-none absolute left-1/2 top-[42%] z-0 w-[118%] max-w-none -translate-x-1/2 -translate-y-1/2 -rotate-[8deg] opacity-40 [filter:drop-shadow(0_0_28px_rgba(182,255,0,0.35))]"
            />
            <div className="relative z-10">
              <RevealStage variants={VARIANTS} alt="Polerón POPE" />
            </div>
            <p className="mt-2 text-center text-sm text-neutral-400">
              Vista previa ilustrativa: el resultado final puede variar según el diseño y la prenda.
            </p>
          </div>
        </div>
      </section>

      {/* Cómo funciona */}
      <section className="border-t border-neutral-800 bg-neutral-950">
        <div className="mx-auto max-w-6xl px-5 py-16 sm:py-20">
          <div className="mb-12 text-center">
            <p className="font-script text-3xl text-neon sm:text-4xl">Así de simple</p>
            <h2 className="font-display text-5xl font-bold uppercase text-white sm:text-6xl">Cómo funciona</h2>
          </div>

          <div className="grid gap-6 md:grid-cols-3">
            {STEPS.map((s) => (
              <article key={s.n} className="glass overflow-hidden rounded-3xl p-5">
                <div className="flex items-center justify-between">
                  <span className="font-display text-6xl font-bold leading-none text-neon">{s.n}</span>
                  <span className="glass-neon flex h-14 w-14 items-center justify-center rounded-full text-black">
                    <Icon name={s.icon} className="h-7 w-7" />
                  </span>
                </div>

                <div className="mt-4 flex aspect-[4/3] items-center justify-center overflow-hidden rounded-2xl bg-black/40">
                  {s.image ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={s.image}
                      alt=""
                      loading="lazy"
                      decoding="async"
                      className={s.n === "01" ? "h-3/4 w-auto object-contain" : "h-full w-full object-contain"}
                    />
                  ) : (
                    <Icon name="box" className="h-24 w-24 text-neon" />
                  )}
                </div>

                <h3 className="mt-5 font-display text-4xl font-bold uppercase text-white">{s.title}</h3>
                <p className="mt-2 text-lg text-neutral-300">{s.text}</p>
              </article>
            ))}
          </div>

          <div className="mt-12 text-center">
            <Link href={editorHref} className="pope-cta text-black">
              <span className="pope-cta-bg" />
              <span className="relative z-10 whitespace-nowrap px-6 py-3 font-display text-3xl font-bold uppercase leading-none tracking-wide sm:px-8">
                Diseña la tuya
              </span>
              <span className="pope-cta-circle" aria-hidden="true">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.2} className="h-5 w-5">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 12h14M13 6l6 6-6 6" />
                </svg>
              </span>
            </Link>
          </div>
        </div>
      </section>
    </main>
  );
}
