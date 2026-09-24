import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// Public endpoint: powers the "elegir de nuestra colección" picker in the
// product personalizer. Only active collections/designs are returned.
export async function GET() {
  const collections = await prisma.designCollection.findMany({
    where: { active: true },
    orderBy: { sortOrder: "asc" },
    include: {
      designs: {
        where: { active: true },
        orderBy: { sortOrder: "asc" },
      },
    },
  });

  return NextResponse.json({
    collections: collections
      .filter((c) => c.designs.length > 0)
      .map((c) => ({
        id: c.id,
        name: c.name,
        category: c.category,
        designs: c.designs.map((d) => ({ id: d.id, name: d.name, imageUrl: d.imageUrl, placement: d.placement })),
      })),
  });
}
