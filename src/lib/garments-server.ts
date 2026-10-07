import { prisma } from "@/lib/prisma";
import type { GarmentColor, GarmentView } from "@/components/CollectionGarmentCard";
import { cardFrame, garmentBox } from "@/lib/garment-box";
import { garmentKind, type StudioGarment } from "@/lib/garments";

// Server-only half of lib/garments: it measures the garment photos with sharp, which can't be bundled
// into a browser page (the design studio imports lib/garments for the plain helpers, and pulling sharp
// in through it broke the production build).

// Each colour of a product carries its own photo and print zone, and those rarely match exactly (a white photo
// framed a little closer, a zone drawn a bit bigger), so the same design looked bigger on one colour than on
// another. The first colour's zone is taken as the reference, measured against the garment itself, and laid
// on the garment of every other colour: the print comes out the same size on all of them.
export async function normalizeZones(colors: GarmentColor[]): Promise<GarmentColor[]> {
  const ref = new Map<string, { view: GarmentView; box: NonNullable<Awaited<ReturnType<typeof garmentBox>>> }>();
  const out: GarmentColor[] = [];
  for (const c of colors) {
    const views: GarmentView[] = [];
    for (const v of c.views) {
      const box = await garmentBox(v.imageUrl);
      const r = ref.get(v.label);
      if (!box) {
        views.push(v);
      } else if (!r) {
        ref.set(v.label, { view: v, box });
        views.push(v);
      } else {
        const rx = (r.view.zoneXPct / 100 - r.box.x) / r.box.w;
        const ry = (r.view.zoneYPct / 100 - r.box.y) / r.box.h;
        const rw = r.view.zoneWidthPct / 100 / r.box.w;
        const rh = r.view.zoneHeightPct / 100 / r.box.h;
        views.push({ ...v, zoneXPct: (box.x + rx * box.w) * 100, zoneYPct: (box.y + ry * box.h) * 100, zoneWidthPct: rw * box.w * 100, zoneHeightPct: rh * box.h * 100 });
      }
    }
    out.push({ ...c, views });
  }
  return out;
}

// The collection cards show every garment photo cut to the same tight frame (/api/garment-photo), so the print zones
// are re-expressed against that frame. Photos that are not the owner's uploads are not cut, and keep their zones.
export async function toCardFrame(colors: GarmentColor[]): Promise<GarmentColor[]> {
  return Promise.all(
    colors.map(async (c) => ({
      ...c,
      views: await Promise.all(
        c.views.map(async (v) => {
          const box = await garmentBox(v.imageUrl);
          if (!box) return v;
          const f = cardFrame(box);
          return {
            ...v,
            zoneXPct: ((v.zoneXPct / 100 - f.x) / f.w) * 100,
            zoneYPct: ((v.zoneYPct / 100 - f.y) / f.h) * 100,
            zoneWidthPct: (v.zoneWidthPct / 100 / f.w) * 100,
            zoneHeightPct: (v.zoneHeightPct / 100 / f.h) * 100,
          };
        }),
      ),
    })),
  );
}

// Every active product that has photos to print on (each color with its Frente/Espalda views and print zones).
export async function loadGarments(): Promise<StudioGarment[]> {
  const products = await prisma.product.findMany({
    where: { active: true, limitedEdition: false },
    orderBy: { createdAt: "desc" },
    include: { colors: { orderBy: { sortOrder: "asc" }, include: { views: { orderBy: { sortOrder: "asc" } } } } },
  });
  const mapped = products
    .map((p) => ({
      id: p.id,
      slug: p.slug,
      name: p.name,
      description: p.description,
      badgeText: p.badgeText,
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
  return Promise.all(mapped.map(async (p) => ({ ...p, colors: await normalizeZones(p.colors) })));
}
