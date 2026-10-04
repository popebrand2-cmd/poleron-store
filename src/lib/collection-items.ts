import { stat } from "fs/promises";
import path from "path";
import sharp from "sharp";
import { prisma } from "@/lib/prisma";
import { uploadsDir } from "@/lib/storage";
import { garmentKind, kindDescription, pickProductForKind } from "@/lib/garments";
import { normalizeZones } from "@/lib/garments-server";
import type { MockupColor } from "@/lib/collection-mockups";
import type { GarmentItem, GarmentKind } from "@/components/CollectionGarmentsGrid";

export const KIND_ORDER: Record<GarmentKind, number> = { polera: 0, poleron: 1, boxy: 2 };
export const KIND_TITLE: Record<GarmentKind, string> = { polera: "Polera", poleron: "Polerón oversize", boxy: "Polerón boxifit" };

type CatalogProduct = Awaited<ReturnType<typeof loadProducts>>[number];

function loadProducts() {
  return prisma.product.findMany({
    where: { active: true },
    orderBy: { createdAt: "desc" },
    include: { colors: { orderBy: { sortOrder: "asc" }, include: { views: { orderBy: { sortOrder: "asc" } } } } },
  });
}

// Every garment that has a photo to print on (product + its colors with Frente/Espalda views and print zones, the zone
// of every color measured against the garment so the print comes out the same size on all of them).
export async function loadGarmentCatalog() {
  const products = await loadProducts();
  const raw = products
    .map((p) => ({
      ...p,
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
  const garments = await Promise.all(raw.map(async (p) => ({ ...p, colors: await normalizeZones(p.colors) })));
  return { products, garments };
}

type Design = {
  id: string;
  name: string;
  imageUrl: string;
  backImageUrl: string;
  showFront: boolean;
  showBack: boolean;
  frontScale: number;
  backScale: number;
};

// The garment cards of one collection: the owner's finished mockups when the collection has them (they cover the
// collection's first design, `coverDesignId`), plus every design printed on every garment of the catalog.
export function buildArtistItems(opts: {
  artistId: string;
  artistName: string;
  designs: Design[];
  coverDesignId: string;
  garments: Awaited<ReturnType<typeof loadGarmentCatalog>>["garments"];
  products: CatalogProduct[];
  mockups: Partial<Record<GarmentKind, MockupColor[]>>;
  editorHref: string;
}): GarmentItem[] {
  const { artistId, artistName, designs, coverDesignId, garments, products, mockups, editorHref } = opts;

  const mockupItems: GarmentItem[] = (Object.keys(KIND_TITLE) as GarmentKind[]).flatMap((kind) => {
    const list = mockups[kind];
    if (!list || list.length === 0) return [];
    const product = pickProductForKind(products, kind);
    const base = product ? `/productos/${product.slug}` : editorHref;
    return [
      {
        key: `${artistId}-${kind}`,
        kind,
        href: `${base}${base.includes("?") ? "&" : "?"}diseno=${coverDesignId}`,
        title: `${KIND_TITLE[kind]} ${artistName}`,
        description: product?.description || kindDescription(kind),
        badge: product?.badgeText || undefined,
        basePrice: product?.basePrice ?? null,
        compareAtPrice: product?.compareAtPrice ?? null,
        colors: list.map((m) => ({ name: m.name, hex: m.hex, views: [], imageUrl: m.imageUrl })),
      },
    ];
  });

  // The finished mockups cover the collection's first design; every other design still gets its own garments,
  // with the art printed front and back on the product photos.
  const overlayDesigns = mockupItems.length > 0 ? designs.filter((d) => d.id !== coverDesignId) : designs;
  const overlayItems: GarmentItem[] = overlayDesigns.flatMap((d) =>
    [...garments]
      .sort((a, b) => KIND_ORDER[garmentKind(a)] - KIND_ORDER[garmentKind(b)])
      .map((p) => ({
        key: `${d.id}-${p.id}`,
        kind: garmentKind(p),
        href: `/productos/${p.slug}?diseno=${d.id}`,
        title: `${KIND_TITLE[garmentKind(p)]} ${d.name}`,
        description: p.description || kindDescription(garmentKind(p)),
        badge: p.badgeText || undefined,
        frontArt: d.showFront ? d.imageUrl : "",
        backArt: d.showBack ? d.backImageUrl || d.imageUrl : "",
        frontScale: d.frontScale,
        backScale: d.backScale,
        basePrice: p.basePrice,
        compareAtPrice: p.compareAtPrice,
        colors: p.colors,
      })),
  );
  return [...mockupItems, ...overlayItems];
}

// Does a design image have transparent areas (a cut-out artwork), as opposed to a full poster with its own background?
// A poster laid on a shirt looks like a sticker pasted on, so the homepage only shows cut-out designs. Cached per file.
const transparencyCache = new Map<string, { mtime: number; clean: boolean }>();
export async function isCutOutDesign(url: string): Promise<boolean> {
  let file: string | null = null;
  if (url.startsWith("/uploads/")) file = path.join(uploadsDir(), url.slice("/uploads/".length));
  else if (url.startsWith("/collections/") || url.startsWith("/designs/")) file = path.join(process.cwd(), "public", url);
  if (!file || file.includes("..")) return false;
  try {
    const mtime = (await stat(file)).mtimeMs;
    const hit = transparencyCache.get(file);
    if (hit && hit.mtime === mtime) return hit.clean;
    const stats = await sharp(file).stats();
    transparencyCache.set(file, { mtime, clean: !stats.isOpaque });
    return !stats.isOpaque;
  } catch {
    return false;
  }
}
