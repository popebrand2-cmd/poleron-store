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
        <section aria-label="Completa tu look" className="mt-12 border-t border-neutral-200 pt-8">
          <h2 className="font-display text-3xl font-bold uppercase leading-none text-black">Completa tu look</h2>
          <p className="mt-1 text-sm text-neutral-600">Otras prendas POPE para personalizar con tu diseño.</p>
          <ul className="mt-5 grid grid-cols-1 gap-4 sm:grid-cols-3">
            {others.map((o) => {
              const img = o.colors[0]?.views[0]?.imageUrl;
              const sale = o.compareAtPrice != null && o.compareAtPrice > o.basePrice;
              return (
                <li key={o.id}>
                  <Link href={`/productos/${o.slug}`} className="group flex items-center gap-4 rounded-xl border border-neutral-200 p-3 transition hover:border-black">
                    <span className="block h-20 w-20 shrink-0 overflow-hidden rounded-lg bg-[#f1f1f1]">
                      {img && (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={thumb(img, 256)} alt={o.name} loading="lazy" className="h-full w-full object-contain transition group-hover:scale-105" />
                      )}
                    </span>
                    <span className="min-w-0">
                      <span className="block truncate text-sm font-bold uppercase tracking-tight text-black">{o.name}</span>
                      <span className="mt-0.5 flex items-baseline gap-2 text-sm">
                        <span className={`font-semibold ${sale ? "text-[#e5484d]" : "text-black"}`}>{formatCLP(o.basePrice)}</span>
                        {sale && <span className="text-xs text-neutral-400 line-through">{formatCLP(o.compareAtPrice as number)}</span>}
                      </span>
                      <span className="mt-1 block text-xs font-bold uppercase tracking-wide text-[#0b6b25]">Personalizar →</span>
                    </span>
                  </Link>
                </li>
              );
            })}
          </ul>
        </section>
      )}

      {showcase.length > 0 && (
        <section aria-label="Más prendas de nuestras colecciones" className="mt-8 overflow-hidden rounded-2xl bg-black p-6">
          <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
            <div>
              <h2 className="font-display text-3xl font-bold uppercase leading-none text-white sm:text-4xl">Más prendas de nuestras colecciones</h2>
              <p className="mt-2 text-sm text-neutral-400">Con el diseño ya puesto, adelante y atrás. Toca una y llévatela.</p>
            </div>
            <Link href="/#colecciones" className="text-xs font-bold uppercase tracking-[0.18em] text-neon transition hover:underline">
              Ver colecciones →
            </Link>
          </div>
          <CollectionGarmentsGrid items={showcase} compact />
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
