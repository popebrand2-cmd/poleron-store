// One-time: launches the "Cyber POPE" sale requested by the owner, price-matching a competitor's
// Cyber prices exactly — Polera $16.490 (was $29.990), Polerón $26.990 (was $39.990) on both hoodie
// variants. The real "before" price is captured into compareAtPrice before the sale price is applied,
// so nothing is lost if the sale needs to be reverted. Guarded by a marker row so re-runs (or later
// manual price edits in Admin > Productos) are never overwritten. If a product doesn't exist yet
// (e.g. a fresh database) it's simply skipped — this never blocks startup.
const { PrismaClient } = require("@prisma/client");

const MARKER = "migration.cyber-sale";
const SALE = [
  { slug: "tee-oversize", price: 16490 },
  { slug: "hoodie-oversize", price: 26990 },
  { slug: "hoodie-boxifit", price: 26990 },
];

(async () => {
  const prisma = new PrismaClient();
  try {
    if (await prisma.siteText.findUnique({ where: { key: MARKER } })) return;
    let n = 0;
    for (const { slug, price } of SALE) {
      const product = await prisma.product.findUnique({ where: { slug } });
      if (!product) continue;
      await prisma.product.update({
        where: { id: product.id },
        data: { compareAtPrice: product.basePrice, basePrice: price },
      });
      n++;
    }
    await prisma.siteText.upsert({
      where: { key: "announce.4" },
      update: {},
      create: {
        key: "announce.4",
        value: "🔥 CYBER POPE: Polera $16.490 · Polerón $26.990 — hasta el 7 de octubre",
      },
    });
    await prisma.siteText.create({ data: { key: MARKER, value: "done" } });
    console.log(`[cyber-sale] applied Cyber pricing to ${n} product(s)`);
  } catch (e) {
    console.error("[cyber-sale] skipped:", e.message);
  } finally {
    await prisma.$disconnect();
  }
})();
