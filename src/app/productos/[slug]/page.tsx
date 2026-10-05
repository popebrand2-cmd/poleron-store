import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { thumb } from "@/lib/thumb";
import { formatCLP } from "@/lib/money";
import { prisma } from "@/lib/prisma";
import ProductPersonalizer from "@/components/ProductPersonalizer";
import CollectionGarmentsGrid from "@/components/CollectionGarmentsGrid";
import ProductInfo from "@/components/ProductInfo";
import { loadShowcaseItems } from "@/lib/collection-items";

export const dynamic = "force-dynamic";

// The product's own name in the tab and in search results (it used to be the generic site title).
export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const p = await prisma.product.findUnique({ where: { slug }, select: { name: true, description: true, active: true } });
  if (!p || !p.active) return { title: "Producto — POPE" };
  const description = p.description || `${p.name} con tu diseño: súbelo, míralo en la prenda real antes de comprar.`;
  return { title: `${p.name} con tu diseño — POPE`, description };
}

export default async function ProductPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const product = await prisma.product.findUnique({
    where: { slug },
    include: {
      sizes: { orderBy: { sortOrder: "asc" } },
      materials: { orderBy: { sortOrder: "asc" } },
      colors: {
        orderBy: { sortOrder: "asc" },
        include: { views: { orderBy: { sortOrder: "asc" } } },
      },
    },
  });

  if (!product || !product.active || product.colors.length === 0) notFound();

  // "Completa tu look": the store's other garments, each one a link to its own personalizer (a design is
  // placed per garment, so this is a shortcut to the next piece, not a one-click add).
  const others = await prisma.product.findMany({
    where: { active: true, id: { not: product.id }, colors: { some: {} } },
    orderBy: { createdAt: "desc" },
    take: 3,
    include: { colors: { orderBy: { sortOrder: "asc" }, take: 1, include: { views: { orderBy: { sortOrder: "asc" }, take: 1 } } } },
  });

  const showcase = await loadShowcaseItems(12);

  return (
    <main className="bg-black px-6 py-10">
    <div className="relative mx-auto max-w-5xl overflow-hidden rounded-2xl bg-white p-6 text-neutral-900 sm:p-8">
      <div className="absolute inset-x-0 top-0 h-1.5 bg-neon" />
      <ProductPersonalizer
        product={{
          id: product.id,
          slug: product.slug,
          name: product.name,
          basePrice: product.basePrice,
          compareAtPrice: product.compareAtPrice,
          sizes: product.sizes.map((s) => ({
            label: s.label,
            priceDelta: s.priceDelta,
            chestCm: s.chestCm,
            lengthCm: s.lengthCm,
            sleeveCm: s.sleeveCm,
          })),
          materials: product.materials.map((m) => ({ label: m.label, priceDelta: m.priceDelta })),
          colors: product.colors.map((c) => ({
            name: c.name,
            hex: c.hex,
            views: c.views.map((v) => ({
              label: v.label,
              imageUrl: v.imageUrl,
              allowRotate: v.allowRotate,
              zoneXPct: v.zoneXPct,
              zoneYPct: v.zoneYPct,
              zoneWidthPct: v.zoneWidthPct,
              zoneHeightPct: v.zoneHeightPct,
              maxWidthCm: v.maxWidthCm,
              maxHeightCm: v.maxHeightCm,
            })),
          })),
        }}
      />
      {others.length > 0 && (
        <section aria-label="Completa tu look" className="mt-8 border-t border-neutral-200 pt-6">
          <h2 className="font-display text-4xl font-bold uppercase leading-none text-black sm:text-5xl">Completa tu look</h2>
          <p className="mt-2 text-base text-neutral-600">Otras prendas POPE para personalizar con tu diseño.</p>
          <ul className="mt-6 grid grid-cols-1 gap-5 lg:grid-cols-2">
            {others.map((o) => {
              const img = o.colors[0]?.views[0]?.imageUrl;
              const sale = o.compareAtPrice != null && o.compareAtPrice > o.basePrice;
              return (
                <li key={o.id}>
                  <Link href={`/productos/${o.slug}`} className="group flex items-center gap-5 rounded-2xl border border-neutral-200 p-4 transition hover:border-black sm:p-5">
                    <span className="block h-28 w-28 shrink-0 overflow-hidden rounded-xl bg-[#f1f1f1] sm:h-36 sm:w-36">
                      {img && (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={thumb(img, 256)} alt={o.name} loading="lazy" className="h-full w-full object-contain transition group-hover:scale-105" />
                      )}
                    </span>
                    <span className="min-w-0">
                      <span className="block text-lg font-bold uppercase leading-tight tracking-tight text-black sm:text-xl">{o.name}</span>
                      <span className="mt-1 flex items-baseline gap-2 text-base sm:text-lg">
                        <span className={`font-semibold ${sale ? "text-[#e5484d]" : "text-black"}`}>{formatCLP(o.basePrice)}</span>
                        {sale && <span className="text-xs text-neutral-400 line-through">{formatCLP(o.compareAtPrice as number)}</span>}
                      </span>
                      <span className="mt-2 block text-sm font-bold uppercase tracking-wide text-[#0b6b25]">Personalizar →</span>
                    </span>
                  </Link>
                </li>
              );
            })}
          </ul>
        </section>
      )}

      {showcase.length > 0 && (
        <section aria-label="Más prendas de nuestras colecciones" className="mt-10 border-t border-neutral-200 pt-8">
          <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
            <div>
              <h2 className="font-display text-4xl font-bold uppercase leading-none text-black sm:text-5xl">Más prendas de nuestras colecciones</h2>
              <p className="mt-2 text-base text-neutral-600">Con el diseño ya puesto, adelante y atrás. Toca una y llévatela.</p>
            </div>
            <Link href="/colecciones" className="text-xs font-bold uppercase tracking-[0.18em] text-[#0b6b25] transition hover:underline">
              Ver colecciones →
            </Link>
          </div>
          <CollectionGarmentsGrid items={showcase} compact light defaultColor="Blanco" />
        </section>
      )}

      {product.description && <p className="mt-12 max-w-2xl text-neutral-600">{product.description}</p>}

      {/* Purchase info (manufacturing, shipping, payment, warranty, WhatsApp): the last thing on the page */}
      <div className="mt-10">
        <ProductInfo />
      </div>
    </div>
    </main>
  );
}
