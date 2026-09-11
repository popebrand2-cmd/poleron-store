import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import ProductForm from "@/components/admin/ProductForm";

export const dynamic = "force-dynamic";

export default async function EditProductPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const product = await prisma.product.findUnique({
    where: { id },
    include: {
      sizes: { orderBy: { sortOrder: "asc" } },
      colors: {
        orderBy: { sortOrder: "asc" },
        include: { views: { orderBy: { sortOrder: "asc" } } },
      },
    },
  });

  if (!product) notFound();

  return (
    <main className="p-6">
      <h1 className="mx-auto mb-6 max-w-3xl text-2xl font-semibold">Editar {product.name}</h1>
      <ProductForm
        initial={{
          id: product.id,
          slug: product.slug,
          name: product.name,
          description: product.description,
          basePrice: product.basePrice,
          active: product.active,
          sizes: product.sizes.map((s) => ({ label: s.label, priceDelta: s.priceDelta })),
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
    </main>
  );
}
