import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import ProductPersonalizer from "@/components/ProductPersonalizer";

export const dynamic = "force-dynamic";

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

  return (
    <main className="mx-auto max-w-5xl px-6 py-10">
      <ProductPersonalizer
        product={{
          id: product.id,
          slug: product.slug,
          name: product.name,
          basePrice: product.basePrice,
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
      {product.description && <p className="mt-12 max-w-2xl text-neutral-600">{product.description}</p>}
    </main>
  );
}
