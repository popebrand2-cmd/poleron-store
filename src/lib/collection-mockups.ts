import { readdir } from "fs/promises";
import path from "path";
import type { GarmentKind } from "@/components/CollectionGarmentsGrid";

// Finished mockup photos (made outside the site) live in public/mockups/<collection-slug>/ and are
// named <prenda>[-<color>].<png|webp|jpg>, e.g. pokemon/poleron-oversize.png and
// pokemon/poleron-oversize-blanco.png. No file = no card for that garment, nothing is invented.
const FILE_KIND: Record<string, GarmentKind> = { polera: "polera", "poleron-oversize": "poleron", "poleron-boxy": "boxy" };
const COLORS: Record<string, { name: string; hex: string }> = {
  negro: { name: "Negro", hex: "#111111" },
  blanco: { name: "Blanco", hex: "#f5f5f0" },
};
const EXT = /\.(png|webp|jpe?g)$/i;

export type MockupColor = { name: string; hex: string; imageUrl: string };

export async function getCollectionMockups(slug: string): Promise<Partial<Record<GarmentKind, MockupColor[]>>> {
  let files: string[] = [];
  try {
    files = await readdir(path.join(process.cwd(), "public", "mockups", slug));
  } catch {
    return {};
  }
  const out: Partial<Record<GarmentKind, MockupColor[]>> = {};
  for (const file of files.sort()) {
    if (!EXT.test(file)) continue;
    const base = file.replace(EXT, "").toLowerCase();
    const match = Object.keys(FILE_KIND).find((k) => base === k || base.startsWith(`${k}-`));
    if (!match) continue;
    const colorSlug = base === match ? "negro" : base.slice(match.length + 1);
    const color = COLORS[colorSlug];
    if (!color) continue;
    (out[FILE_KIND[match]] ??= []).push({ ...color, imageUrl: `/mockups/${slug}/${file}` });
  }
  for (const list of Object.values(out)) list.sort((a, b) => (a.name === "Negro" ? -1 : b.name === "Negro" ? 1 : 0));
  return out;
}
