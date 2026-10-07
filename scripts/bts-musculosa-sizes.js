// One-time, asked by the owner (07-10-2026): the Musculosa BTS is sold only in sizes S, M and L. Removes XS, XL and XXL from the
// product (the S/M/L measurements stay). Marker-guarded; waits for the product to exist; never blocks startup.
const { PrismaClient } = require("@prisma/client");

const MARKER = "migration.bts-musculosa-sizes-2026-10-07";
const KEEP = ["S", "M", "L"];

(async () => {
  const prisma = new PrismaClient();
  try {
    if (await prisma.siteText.findUnique({ where: { key: MARKER } })) return;
    const p = await prisma.product.findUnique({ where: { slug: "musculosa-bts" }, include: { sizes: true } });
    if (!p || p.sizes.length === 0) return; // not created yet: try again on the next start
    await prisma.productSize.deleteMany({ where: { productId: p.id, label: { notIn: KEEP } } });
    for (const [i, label] of KEEP.entries()) {
      await prisma.productSize.updateMany({ where: { productId: p.id, label }, data: { sortOrder: i } });
    }
    console.log("[bts-musculosa-sizes] only S, M, L left");
    await prisma.siteText.create({ data: { key: MARKER, value: "done" } });
  } catch (e) {
    console.error("[bts-musculosa-sizes] skipped:", e.message);
  } finally {
    await prisma.$disconnect();
  }
})();
