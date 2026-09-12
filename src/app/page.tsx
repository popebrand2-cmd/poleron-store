import Link from "next/link";
import { prisma } from "@/lib/prisma";
import FeaturedCarousel from "@/components/FeaturedCarousel";

export const dynamic = "force-dynamic";

const HERO_VALUES = [
  {
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.6} className="h-5 w-5">
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 15V4m0 0L8 8m4-4l4 4" />
        <path strokeLinecap="round" strokeLinejoin="round" d="M4 15v3a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-3" />
      </svg>
    ),
    text: "Tú traes la idea. Nosotros la hacemos realidad en la prenda.",
  },
  {
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.6} className="h-5 w-5">
        <path strokeLinecap="round" strokeLinejoin="round" d="M8 4L4 7v3h3v10h10V10h3V7l-4-3" />
        <path strokeLinecap="round" strokeLinejoin="round" d="M8 4a4 4 0 0 0 8 0" />
      </svg>
    ),
    text: "Cada pieza es única — hecha a tu medida, no en serie.",
  },
  {
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.6} className="h-5 w-5">
        <circle cx="12" cy="8" r="3.2" />
        <path strokeLinecap="round" strokeLinejoin="round" d="M5 20c1.2-4 4-6 7-6s5.8 2 7 6" />
      </svg>
    ),
    text: "Aquí no eres cliente. Eres quien diseña.",
  },
];

const HOW_IT_WORKS = [
  {
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.6} className="h-7 w-7">
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 15V4m0 0L8 8m4-4l4 4" />
        <path strokeLinecap="round" strokeLinejoin="round" d="M4 15v3a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-3" />
      </svg>
    ),
    title: "Sube tu diseño",
    text: "Una foto, un dibujo, un logo o texto. Lo que tengas en mente.",
  },
  {
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.6} className="h-7 w-7">
        <path strokeLinecap="round" strokeLinejoin="round" d="M4 20l3.5-1 10-10a1.5 1.5 0 0 0 0-2.1L16 5.4a1.5 1.5 0 0 0-2.1 0l-10 10L3 19l1 1z" />
        <path strokeLinecap="round" strokeLinejoin="round" d="M13 6.5l4.5 4.5" />
      </svg>
    ),
    title: "Personalízalo en vivo",
    text: "Ajusta tamaño, posición y color sobre la prenda real. Ves el mockup exacto antes de comprar.",
  },
  {
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.6} className="h-7 w-7">
        <path strokeLinecap="round" strokeLinejoin="round" d="M4 8l8-4 8 4-8 4-8-4z" />
        <path strokeLinecap="round" strokeLinejoin="round" d="M4 8v8l8 4 8-4V8M12 12v8" />
      </svg>
    ),
    title: "Lo hacemos realidad",
    text: "Lo confeccionamos e imprimimos tal cual lo dejaste. Edición única, hecha para ti.",
  },
];

const FAQS = [
  {
    q: "¿Puedo ver mi diseño antes de pagar?",
    a: "Sí. El editor te muestra un mockup real sobre la prenda — con tu diseño, tamaño y posición exactos — antes de agregarlo al carrito.",
  },
  {
    q: "¿Qué puedo subir como diseño?",
    a: "Lo que tengas en mente: una foto, un dibujo, un logo o texto. Tú eliges qué personalizar.",
  },
  {
    q: "¿Cada prenda es realmente única?",
    a: "Sí. Cada pieza se confecciona bajo pedido con tu diseño — no manejamos stock genérico ni diseños repetidos.",
  },
  {
    q: "¿Cómo se calcula el envío?",
    a: "Según tu comuna. Eliges dirección de despacho en el checkout y el costo se calcula automáticamente antes de pagar.",
  },
  {
    q: "¿Los pagos son seguros?",
    a: "Sí, todos los pagos se procesan a través de Mercado Pago — nunca almacenamos tus datos de tarjeta.",
  },
];

const TRUST_BADGES = [
  {
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} className="h-7 w-7">
        <rect x="5" y="11" width="14" height="9" rx="1.5" />
        <path strokeLinecap="round" d="M8 11V7a4 4 0 0 1 8 0v4" />
      </svg>
    ),
    title: "Compra segura",
    text: "Tu información de pago está protegida.",
  },
  {
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} className="h-7 w-7">
        <path strokeLinecap="round" strokeLinejoin="round" d="M3 16V6a1 1 0 0 1 1-1h9v11" />
        <path strokeLinecap="round" strokeLinejoin="round" d="M13 9h4l3 3v4h-7" />
        <circle cx="7.5" cy="17.5" r="1.7" />
        <circle cx="16.5" cy="17.5" r="1.7" />
      </svg>
    ),
    title: "Envío a todo Chile",
    text: "Retiro gratis en Santiago o despacho a domicilio por comuna.",
  },
  {
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} className="h-7 w-7">
        <path strokeLinecap="round" strokeLinejoin="round" d="M4 12a8 8 0 0 1 13.66-5.66M20 12a8 8 0 0 1-13.66 5.66" />
        <path strokeLinecap="round" strokeLinejoin="round" d="M17.5 3v4h-4M6.5 21v-4h4" />
      </svg>
    ),
    title: "Cambios y garantía",
    text: "Si algo llega con falla de fábrica, lo resolvemos contigo.",
  },
  {
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} className="h-7 w-7">
        <path strokeLinecap="round" strokeLinejoin="round" d="M4 20l3.5-1 10-10a1.5 1.5 0 0 0 0-2.1L16 5.4a1.5 1.5 0 0 0-2.1 0l-10 10L3 19l1 1z" />
        <path strokeLinecap="round" strokeLinejoin="round" d="M13 6.5l4.5 4.5" />
      </svg>
    ),
    title: "100% Personalizable",
    text: "Tú diseñas, nosotros lo hacemos realidad.",
  },
];

// Only two garment types exist today, so this maps straight to a slug each
// — once there's more than one product per type this should point at a
// real category listing instead of a single product.
const BROWSE_TYPES = [
  { label: "Polerones", match: (name: string) => /hoodie|poler[oó]n/i.test(name) },
  { label: "Poleras", match: (name: string) => /tee|polera/i.test(name) },
];

export default async function Home() {
  const [products, settings, designCollections] = await Promise.all([
    prisma.product.findMany({
      where: { active: true },
      orderBy: { createdAt: "desc" },
      include: { colors: { include: { views: true } } },
    }),
    prisma.storeSettings.findUnique({ where: { id: "singleton" } }),
    prisma.designCollection.findMany({
      where: { active: true },
      orderBy: { sortOrder: "asc" },
      include: { designs: { where: { active: true }, orderBy: { sortOrder: "asc" } } },
    }),
  ]);
  const collectionsWithDesigns = designCollections.filter((c) => c.designs.length > 0);
  const heroImageUrl = settings?.heroImageUrl || "";
  const heroEyebrow = settings?.heroEyebrow || "MAD · Personalización 100% real";
  const heroHeadlineLines = (
    settings?.heroHeadline || "Diseña\ntu propia\nesencia."
  ).split("\n");
  const heroSubtext =
    settings?.heroSubtext ||
    "Sube tu diseño, personalízalo sobre la prenda real y mira el resultado antes de comprar. Sin catálogos genéricos — cada pieza sale exactamente como la imaginaste.";
  const heroCta = settings?.heroCta || "Personaliza aquí";
  const heroImageAlign = (settings?.heroImageAlign as "left" | "right") || "right";

  return (
    <main>
      {/* Hero */}
      <section className="relative overflow-hidden bg-black">
        <div
          aria-hidden="true"
          className={`pointer-events-none absolute inset-0 ${
            heroImageAlign === "left"
              ? "bg-[linear-gradient(to_right,_rgba(35,110,35,0.55)_0%,_rgba(10,30,10,0.35)_65%,_#000_100%)]"
              : "bg-[linear-gradient(to_left,_rgba(35,110,35,0.55)_0%,_rgba(10,30,10,0.35)_65%,_#000_100%)]"
          }`}
        />
        <div className="relative z-10 mx-auto max-w-6xl px-6 py-16 sm:py-20 md:py-28">
          <div
            className={`max-w-xl sm:max-w-[46%] lg:max-w-xl ${
              heroImageAlign === "left" ? "sm:ml-auto" : ""
            }`}
          >
            <span className="inline-flex items-center gap-2 rounded-full border border-neutral-700 px-3 py-1 text-[11px] font-bold uppercase tracking-[0.15em] text-neutral-300">
              <span className="h-1.5 w-1.5 rounded-full bg-neon" /> {heroEyebrow}
            </span>

            <h1 className="mt-5 text-4xl font-extrabold uppercase leading-[0.95] tracking-tight text-white sm:text-5xl lg:text-7xl">
              {heroHeadlineLines.map((line, i) =>
                i === heroHeadlineLines.length - 1 ? (
                  <span key={i} className="text-neon">
                    {line}
                  </span>
                ) : (
                  <span key={i}>
                    {line}
                    <br />
                  </span>
                ),
              )}
            </h1>

            <p className="mt-6 max-w-md text-neutral-400">{heroSubtext}</p>

            <ul className="mt-8 space-y-4">
              {HERO_VALUES.map((v, i) => (
                <li key={i} className="flex items-start gap-3">
                  <span className="mt-0.5 shrink-0 text-neon">{v.icon}</span>
                  <span className="text-sm text-neutral-300">{v.text}</span>
                </li>
              ))}
            </ul>

            <div className="mt-10">
              <Link
                href="#tienda"
                className="group inline-flex items-center gap-5 rounded-full bg-neon py-3 pl-9 pr-3 text-lg font-bold uppercase tracking-wide text-black transition hover:brightness-90 sm:text-xl"
              >
                {heroCta}
                <span className="flex h-12 w-12 items-center justify-center rounded-full bg-black text-neon transition group-hover:translate-x-0.5">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="h-5 w-5">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 12h14M13 6l6 6-6 6" />
                  </svg>
                </span>
              </Link>
            </div>
          </div>
        </div>

        {heroImageUrl && (
          <div
            className={`relative z-0 mx-auto aspect-[2/3] w-full max-w-[280px] px-6 pb-12 sm:absolute sm:inset-y-0 sm:z-0 sm:mx-0 sm:aspect-auto sm:w-[54%] sm:max-w-none sm:px-0 sm:pb-0 lg:w-[40%] ${
              heroImageAlign === "left" ? "sm:left-0" : "sm:right-0"
            }`}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={heroImageUrl}
              alt="Prenda personalizada"
              className={`h-full w-full object-contain object-center ${
                heroImageAlign === "left" ? "sm:object-left" : "sm:object-right"
              }`}
            />
            <div
              className={`absolute inset-y-0 hidden w-1/3 sm:block ${
                heroImageAlign === "left"
                  ? "right-0 bg-gradient-to-l from-black to-transparent"
                  : "left-0 bg-gradient-to-r from-black to-transparent"
              }`}
            />
          </div>
        )}

        {!heroImageUrl && (
          <div
            className={`absolute inset-y-0 hidden w-[42%] flex-col items-center justify-center gap-3 lg:flex ${
              heroImageAlign === "left" ? "left-0" : "right-0"
            }`}
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1} className="h-20 w-20 text-neutral-800">
              <path strokeLinecap="round" strokeLinejoin="round" d="M4 16l4.5-6 3.5 4 2.5-3L20 16" />
              <rect x="3" y="4" width="18" height="16" rx="2" />
              <circle cx="8.5" cy="8.5" r="1.5" />
            </svg>
            <p className="text-xs uppercase tracking-widest text-neutral-700">Foto próximamente</p>
          </div>
        )}
      </section>

      {/* Manifesto banner */}
      <section className="border-t border-neutral-800 bg-black py-14">
        <p className="mx-auto max-w-4xl px-6 text-center text-3xl font-black uppercase leading-[1.05] tracking-tight text-white sm:text-4xl lg:text-5xl">
          No vendemos catálogos. <span className="text-neon">Hacemos realidad tu idea.</span>
        </p>
        <p className="mx-auto mt-5 max-w-lg px-6 text-center text-sm text-neutral-400">
          Cada pedido es una colaboración: tú traes la idea, nosotros la construimos en la prenda. Sin
          diseños genéricos, sin stock repetido — cada pieza existe porque alguien la imaginó.
        </p>
      </section>

      {/* How it works */}
      <section className="border-t border-neutral-800 bg-neutral-950">
        <div className="mx-auto max-w-6xl px-6 py-16">
          <div className="mb-12 text-center">
            <p className="mb-3 flex items-center justify-center gap-3 text-xs font-bold uppercase tracking-[0.2em] text-neon">
              <span className="h-px w-8 bg-neon" /> Así de simple <span className="h-px w-8 bg-neon" />
            </p>
            <h2 className="text-3xl font-extrabold uppercase tracking-tight text-white sm:text-4xl">
              Cómo funciona
            </h2>
          </div>
          <div className="grid grid-cols-1 gap-10 sm:grid-cols-3">
            {HOW_IT_WORKS.map((step, i) => (
              <div key={i} className="relative text-center">
                <span className="pointer-events-none absolute -top-6 left-1/2 -translate-x-1/2 text-6xl font-black text-white/[0.06]">
                  {String(i + 1).padStart(2, "0")}
                </span>
                <div className="relative flex flex-col items-center">
                  <span className="mb-4 flex h-14 w-14 items-center justify-center rounded-full border border-neutral-700 text-neon">
                    {step.icon}
                  </span>
                  <p className="text-sm font-extrabold uppercase tracking-wide text-white">{step.title}</p>
                  <p className="mt-2 max-w-xs text-sm text-neutral-400">{step.text}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Trust badges */}
      <section className="border-t border-neutral-800 bg-neutral-950">
        <div className="mx-auto grid max-w-6xl grid-cols-2 gap-8 px-6 py-12 sm:grid-cols-4">
          {TRUST_BADGES.map((v, i) => (
            <div key={i} className="flex flex-col items-center text-center">
              <span className="mb-3 text-neon">{v.icon}</span>
              <p className="text-xs font-extrabold uppercase tracking-wide text-white">{v.title}</p>
              <p className="mt-1 text-xs text-neutral-400">{v.text}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Browse by garment type */}
      <section className="bg-black">
        <div className="border-y border-neutral-800 bg-neutral-950 py-3 text-center">
          <h2 className="text-lg font-extrabold uppercase tracking-widest text-white">
            <span className="text-neon">MAD</span> · Encuentra tu estilo
          </h2>
        </div>
        <div className="mx-auto grid max-w-6xl grid-cols-1 gap-5 px-6 py-10 sm:grid-cols-2">
          {BROWSE_TYPES.map((t) => {
            const product = products.find((p) => t.match(p.name));
            if (!product) return null;
            const cover = product.colors[0]?.views[0]?.imageUrl;
            return (
              <Link
                key={t.label}
                href={`/productos/${product.slug}`}
                className="group relative aspect-[16/10] overflow-hidden rounded-xl border-2 border-transparent bg-neon/70 p-6 transition hover:border-neon"
              >
                {cover && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={cover}
                    alt={t.label}
                    className="h-full w-full object-contain transition duration-300 group-hover:scale-105"
                  />
                )}
                <span className="absolute bottom-4 left-4 rounded bg-white px-3 py-1.5 text-xs font-bold uppercase tracking-wide text-black shadow">
                  {t.label} →
                </span>
              </Link>
            );
          })}
        </div>
      </section>

      {/* Featured */}
      <section id="tienda" className="bg-black">
        <div className="mx-auto max-w-6xl px-6 py-16">
          <div className="mb-10 text-center">
            <p className="mb-3 flex items-center justify-center gap-3 text-xs font-bold uppercase tracking-[0.2em] text-neon">
              <span className="h-px w-8 bg-neon" /> MAD · Hecho para ti <span className="h-px w-8 bg-neon" />
            </p>
            <h2 className="text-3xl font-extrabold uppercase tracking-tight text-white sm:text-4xl">
              Lo más buscado
            </h2>
            <p className="mt-2 text-neutral-400">Elige tu prenda base y hazla completamente tuya</p>
          </div>

          {products.length === 0 ? (
            <p className="text-center text-neutral-500">Todavía no hay productos publicados.</p>
          ) : (
            <FeaturedCarousel
              products={products.map((p) => ({
                id: p.id,
                slug: p.slug,
                name: p.name,
                basePrice: p.basePrice,
                colors: p.colors.map((c) => ({
                  name: c.name,
                  hex: c.hex,
                  imageUrl: c.views[0]?.imageUrl ?? null,
                })),
              }))}
            />
          )}
        </div>
      </section>

      {/* Preset design collections */}
      {collectionsWithDesigns.length > 0 && (
        <section id="colecciones" className="border-t border-neutral-800 bg-black">
          <div className="mx-auto max-w-6xl px-6 py-16">
            <div className="mb-10 text-center">
              <p className="mb-3 flex items-center justify-center gap-3 text-xs font-bold uppercase tracking-[0.2em] text-neon">
                <span className="h-px w-8 bg-neon" /> MAD · Colecciones <span className="h-px w-8 bg-neon" />
              </p>
              <h2 className="text-3xl font-extrabold uppercase tracking-tight text-white sm:text-4xl">
                ¿No sabes qué diseñar?
              </h2>
              <p className="mt-2 text-neutral-400">
                Elige uno de estos diseños listos y estámpalo directo en tu prenda — sin partir de cero.
              </p>
            </div>

            <div className="space-y-10">
              {collectionsWithDesigns.map((c) => (
                <div key={c.id}>
                  <h3 className="mb-4 text-sm font-bold uppercase tracking-widest text-white">{c.name}</h3>
                  <div className="flex gap-4 overflow-x-auto pb-2">
                    {c.designs.map((d) => (
                      <div
                        key={d.id}
                        className="flex w-32 shrink-0 flex-col items-center gap-2 rounded-lg border border-neutral-800 bg-neutral-950 p-3"
                      >
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src={d.imageUrl} alt={d.name} className="h-20 w-20 object-contain" />
                        <p className="truncate text-center text-xs text-neutral-400">{d.name}</p>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>

            <div className="mt-10 text-center">
              <Link
                href="#tienda"
                className="group inline-flex items-center gap-4 rounded-full bg-neon py-2 pl-6 pr-2 text-sm font-bold uppercase tracking-wide text-black transition hover:brightness-90"
              >
                Personaliza aquí
                <span className="flex h-9 w-9 items-center justify-center rounded-full bg-black text-neon transition group-hover:translate-x-0.5">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="h-4 w-4">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 12h14M13 6l6 6-6 6" />
                  </svg>
                </span>
              </Link>
            </div>
          </div>
        </section>
      )}

      {/* FAQ */}
      <section className="border-t border-neutral-800 bg-neutral-950">
        <div className="mx-auto max-w-3xl px-6 py-16">
          <div className="mb-10 text-center">
            <p className="mb-3 flex items-center justify-center gap-3 text-xs font-bold uppercase tracking-[0.2em] text-neon">
              <span className="h-px w-8 bg-neon" /> Dudas <span className="h-px w-8 bg-neon" />
            </p>
            <h2 className="text-3xl font-extrabold uppercase tracking-tight text-white sm:text-4xl">
              Preguntas frecuentes
            </h2>
          </div>
          <div className="divide-y divide-neutral-800 rounded-xl border border-neutral-800">
            {FAQS.map((item, i) => (
              <details key={i} className="group p-5 open:bg-black/40">
                <summary className="flex cursor-pointer list-none items-center justify-between gap-4 text-sm font-bold text-white">
                  {item.q}
                  <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full border border-neutral-700 text-neon transition group-open:rotate-45">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="h-3.5 w-3.5">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M12 5v14M5 12h14" />
                    </svg>
                  </span>
                </summary>
                <p className="mt-3 text-sm text-neutral-400">{item.a}</p>
              </details>
            ))}
          </div>
        </div>
      </section>
    </main>
  );
}
