import { prisma } from "@/lib/prisma";

// The hero, collections and artist catalog send customers straight to the real editor: the
// Oversize hoodie (falling back to any other hoodie, then any product).
export async function getEditorHref(): Promise<string> {
  const products = await prisma.product.findMany({ where: { active: true }, orderBy: { createdAt: "desc" }, select: { name: true, slug: true } });
  const isHoodie = (p: { name: string; slug: string }) => /hoodie|poler[oó]n/i.test(`${p.name} ${p.slug}`);
  const hoodie = products.find((p) => isHoodie(p) && /oversize/i.test(`${p.name} ${p.slug}`)) ?? products.find(isHoodie) ?? products[0];
  return hoodie ? `/productos/${hoodie.slug}` : "/#tienda";
}
