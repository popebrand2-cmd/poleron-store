import { prisma } from "@/lib/prisma";
import type { GarmentKind } from "@/components/CollectionGarmentsGrid";
import type { GarmentColor } from "@/components/CollectionGarmentCard";

// Garment type from the product's own name/slug: "boxy" wins, then hoodies/polerones, everything else is a polera.
export function garmentKind(p: { name: string; slug: string }): GarmentKind {
  const s = `${p.name} ${p.slug}`;
  if (/boxy/i.test(s)) return "boxy";
  if (/hoodie|poler[oó]n/i.test(s)) return "poleron";
  return "polera";
}

export type StudioGarment = {
  id: string;
  slug: string;
  name: string;
  description: string;
  basePrice: number;
  compareAtPrice: number | null;
  kind: GarmentKind;
  colors: GarmentColor[];
};

// Every active product that has photos to print on (each color with its Frente/Espalda views and print zones).
export async function loadGarments(): Promise<StudioGarment[]> {
  const products = await prisma.product.findMany({
    where: { active: true },
    orderBy: { createdAt: "desc" },
    include: { colors: { orderBy: { sortOrder: "asc" }, include: { views: { orderBy: { sortOrder: "asc" } } } } },
  });
  return products
    .map((p) => ({
      id: p.id,
      slug: p.slug,
      name: p.name,
      description: p.description,
      basePrice: p.basePrice,
      compareAtPrice: p.compareAtPrice,
      kind: garmentKind(p),
      colors: p.colors
        .map((c) => ({
          name: c.name,
          hex: c.hex,
          views: c.views
            .filter((v) => v.imageUrl)
            .map((v) => ({ label: v.label, imageUrl: v.imageUrl, zoneXPct: v.zoneXPct, zoneYPct: v.zoneYPct, zoneWidthPct: v.zoneWidthPct, zoneHeightPct: v.zoneHeightPct })),
        }))
        .filter((c) => c.views.length > 0),
    }))
    .filter((p) => p.colors.length > 0);
}
