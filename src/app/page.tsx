import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { formatCLP } from "@/lib/money";

export const dynamic = "force-dynamic";

const VALUE_PROPS = [
  {
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} className="h-7 w-7">
        <path strokeLinecap="round" strokeLinejoin="round" d="M4 20l3.5-1 10-10a1.5 1.5 0 0 0 0-2.1L16 5.4a1.5 1.5 0 0 0-2.1 0l-10 10L3 19l1 1z" />
        <path strokeLinecap="round" strokeLinejoin="round" d="M13 6.5l4.5 4.5" />
      </svg>
    ),
    text: "Subes tu propio diseño y lo personalizas en tiempo real, con las medidas reales de la prenda.",
  },
  {
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} className="h-7 w-7">
        <path strokeLinecap="round" strokeLinejoin="round" d="M8 4L4 8l3 2v10h10V10l3-2-4-4-3 2h-2z" />
      </svg>
    ),
    text: "Ves el mockup real antes de comprar — sabes exactamente cómo va a quedar impreso.",
  },
  {
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} className="h-7 w-7">
        <circle cx="12" cy="12" r="9" />
        <path strokeLinecap="round" d="M12 3a9 9 0 0 1 0 18M8 7a6 6 0 0 1 8 8M8 17a6 6 0 0 1 0-10M16 12a4 4 0 0 1-4 4" />
      </svg>
    ),
    text: "Aquí no hay dos iguales. Tu prenda es tan única como tu diseño.",
  },
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

      {/* Value props */}
      <section className="border-t border-neutral-800 bg-neutral-950">
        <div className="mx-auto grid max-w-6xl grid-cols-1 gap-8 px-6 py-12 sm:grid-cols-3">
          {VALUE_PROPS.map((v, i) => (
            <div key={i} className="flex items-start gap-4">
              <span className="shrink-0 text-neon">{v.icon}</span>
              <p className="text-sm text-neutral-300">{v.text}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Products */}
      <section id="tienda" className="bg-black">
        <div className="mx-auto max-w-6xl px-6 py-16">
          <h2 className="mb-8 text-2xl font-extrabold uppercase tracking-tight text-white">Elige tu prenda</h2>

          {products.length === 0 ? (
            <p className="text-neutral-500">Todavía no hay productos publicados.</p>
          ) : (
            <div className="grid grid-cols-2 gap-6 sm:grid-cols-3 lg:grid-cols-4">
              {products.map((p) => {
                const cover = p.colors[0]?.views[0];
                return (
                  <Link
                    key={p.id}
                    href={`/productos/${p.slug}`}
                    className="group overflow-hidden rounded-xl border border-neutral-800 bg-neutral-900 transition hover:border-neon"
                  >
                    <div className="aspect-square overflow-hidden bg-neutral-950">
                      {cover && (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={cover.imageUrl}
                          alt={p.name}
                          className="h-full w-full object-cover transition group-hover:scale-105"
                        />
                      )}
                    </div>
                    <div className="p-3">
                      <p className="font-medium text-white">{p.name}</p>
                      <p className="text-sm text-neutral-400">{formatCLP(p.basePrice)}</p>
                    </div>
                  </Link>
                );
              })}
            </div>
          )}
        </div>
      </section>
    </main>
  );
}
