import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { formatCLP } from "@/lib/money";

export const dynamic = "force-dynamic";

export default async function Home() {
  const products = await prisma.product.findMany({
    where: { active: true },
    orderBy: { createdAt: "desc" },
    include: { colors: { include: { views: true } } },
  });

  return (
    <main className="mx-auto max-w-6xl px-6 py-10">
      <div className="mb-10">
        <h1 className="text-3xl font-bold tracking-tight">Diseña tu propia ropa</h1>
        <p className="mt-2 text-neutral-600">
          Elige una prenda, sube tu diseño y mira el mockup real antes de comprar.
        </p>
      </div>

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
                className="group overflow-hidden rounded-xl border border-neutral-200 bg-white"
              >
                <div className="aspect-square overflow-hidden bg-neutral-100">
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
                  <p className="font-medium">{p.name}</p>
                  <p className="text-sm text-neutral-500">{formatCLP(p.basePrice)}</p>
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </main>
  );
}
