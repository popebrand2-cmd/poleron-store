import { prisma } from "@/lib/prisma";
import type { GarmentKind } from "@/components/CollectionGarmentsGrid";
import type { GarmentColor } from "@/components/CollectionGarmentCard";

// Garment type from the product's own name/slug: boxy fit ("boxy", "boxifit", "box fit") wins, then hoodies/polerones,
// everything else is a polera. The real slugs are tee-oversize, hoodie-oversize and hoodie-boxifit.
export function garmentKind(p: { name: string; slug: string }): GarmentKind {
  const s = `${p.name} ${p.slug}`;
  if (/box[iy]|box[\s-]*fit/i.test(s)) return "boxy";
  if (/hoodie|poler[oó]n/i.test(s)) return "poleron";
  return "polera";
}

// The product that represents a garment type on the collection pages: the main store product of that type
// first, otherwise one that is on sale (so the savings badge shows), otherwise the first one.
const MAIN_SLUG: Record<GarmentKind, string> = { polera: "tee-oversize", poleron: "hoodie-oversize", boxy: "hoodie-boxifit" };
export function pickProductForKind<T extends { name: string; slug: string; basePrice: number; compareAtPrice: number | null }>(products: T[], kind: GarmentKind): T | undefined {
  const ofKind = products.filter((p) => garmentKind(p) === kind);
  return ofKind.find((p) => p.slug === MAIN_SLUG[kind]) ?? ofKind.find((p) => p.compareAtPrice != null && p.compareAtPrice > p.basePrice) ?? ofKind[0];
}

// Shown under the name when the product has no description of its own. The wording is the owner's own for the
// polera, applied identically to both polerones (only the garment name changes).
export function kindDescription(kind: GarmentKind): string {
  const what = kind === "polera" ? "Polera oversize" : kind === "boxy" ? "Polerón boxifit" : "Polerón oversize";
  return `${what} 100% algodón, con tu diseño estampado en frente y/o espalda.`;
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
