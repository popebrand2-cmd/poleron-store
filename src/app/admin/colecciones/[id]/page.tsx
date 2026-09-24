import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import CollectionEditor from "@/components/admin/CollectionEditor";

export const dynamic = "force-dynamic";

export default async function AdminCollectionPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const collection = await prisma.designCollection.findUnique({
    where: { id },
    include: { designs: { orderBy: { sortOrder: "asc" } } },
  });

  if (!collection) notFound();
  const all = await prisma.designCollection.findMany({ select: { category: true } });
  const categories = [...new Set(all.map((c) => c.category).filter(Boolean))];

  return (
    <main className="mx-auto max-w-5xl p-6">
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-semibold">{collection.name}</h1>
        <Link href="/admin/colecciones" className="text-sm font-medium text-neutral-700 hover:underline">
          ← Colecciones
        </Link>
      </div>

      <CollectionEditor
        categories={categories}
        collection={{
          id: collection.id,
          name: collection.name,
          active: collection.active,
          category: collection.category,
          designs: collection.designs.map((d) => ({
            id: d.id,
            name: d.name,
            imageUrl: d.imageUrl,
            placement: d.placement as "FRONT" | "BACK",
            active: d.active,
          })),
        }}
      />
    </main>
  );
}
