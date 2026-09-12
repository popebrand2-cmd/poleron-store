import Link from "next/link";
import { prisma } from "@/lib/prisma";
import FeaturedCarousel from "@/components/FeaturedCarousel";

export const dynamic = "force-dynamic";

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
  const [products, settings] = await Promise.all([
    prisma.product.findMany({
      where: { active: true },
      orderBy: { createdAt: "desc" },
      include: { colors: { include: { views: true } } },
    }),
    prisma.storeSettings.findUnique({ where: { id: "singleton" } }),
  ]);
  const heroImageUrl = settings?.heroImageUrl || "";

  return (
    <main>
      {/* Hero */}
      <section className="relative overflow-hidden bg-black">
        <div className="mx-auto grid max-w-6xl grid-cols-1 items-center gap-10 px-6 py-16 md:grid-cols-2 md:py-24">
          <div>
            <p className="mb-4 text-xs font-bold uppercase tracking-[0.2em] text-neon">
              Tu diseño, tu regla
            </p>
            <h1 className="text-4xl font-extrabold uppercase leading-[1.05] tracking-tight text-white sm:text-5xl lg:text-6xl">
              Viste tu propia esencia
            </h1>
            <p className="mt-5 max-w-md text-neutral-400">
              Sube tu diseño, personalízalo sobre la prenda real y míralo hecho realidad. Sin catálogos genéricos —
              cada pieza sale exactamente como la imaginaste.
            </p>
            <div className="mt-8 flex flex-wrap gap-4">
              <Link
                href="#tienda"
                className="rounded-md bg-neon px-6 py-3 text-sm font-bold uppercase tracking-wide text-black transition hover:brightness-90"
              >
                Personalizar ahora
              </Link>
            </div>
          </div>

          <div className="relative mx-auto aspect-[4/5] w-full max-w-sm overflow-hidden rounded-2xl border border-neutral-800 bg-neutral-900">
            {heroImageUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={heroImageUrl} alt="Prenda personalizada" className="h-full w-full object-cover" />
            ) : (
              <div className="flex h-full w-full flex-col items-center justify-center gap-3 bg-gradient-to-br from-neutral-900 via-neutral-950 to-black p-8 text-center">
                <svg
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth={1.2}
                  className="h-16 w-16 text-neutral-700"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" d="M4 16l4.5-6 3.5 4 2.5-3L20 16" />
                  <rect x="3" y="4" width="18" height="16" rx="2" />
                  <circle cx="8.5" cy="8.5" r="1.5" />
                </svg>
                <p className="text-xs uppercase tracking-widest text-neutral-600">Foto próximamente</p>
              </div>
            )}
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
          <h2 className="text-lg font-extrabold uppercase tracking-widest text-white">Encuentra tu estilo</h2>
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
                className="group relative aspect-[16/10] overflow-hidden rounded-xl border-2 border-transparent bg-white transition hover:border-neon"
              >
                {cover && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={cover}
                    alt={t.label}
                    className="h-full w-full object-cover transition duration-300 group-hover:scale-105"
                  />
                )}
                <span className="absolute bottom-4 left-4 rounded bg-neon px-3 py-1.5 text-xs font-bold uppercase tracking-wide text-black shadow">
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
              <span className="h-px w-8 bg-neon" /> Hecho para ti <span className="h-px w-8 bg-neon" />
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
    </main>
  );
}
