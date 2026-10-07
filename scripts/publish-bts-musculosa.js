// One-time, asked by the owner (07-10-2026): the Musculosa BTS goes on sale at $18.999 as an exclusive piece. No unit cap and
// no closing date are invented: the counter and the countdown appear once the owner sets the real stock / date in
// Admin > Productos. Waits for the draft to exist; marker-guarded; never blocks startup.
const { PrismaClient } = require("@prisma/client");

const MARKER = "migration.publish-bts-musculosa-2026-10-07";

(async () => {
  const prisma = new PrismaClient();
  try {
    if (await prisma.siteText.findUnique({ where: { key: MARKER } })) return;
    const p = await prisma.product.findUnique({ where: { slug: "musculosa-bts" } });
    if (!p) return;
    await prisma.product.update({ where: { id: p.id }, data: { basePrice: 18999, active: true, limitedEdition: true } });
    console.log("[publish-bts-musculosa] on sale at $18.999");
    await prisma.siteText.create({ data: { key: MARKER, value: "done" } });
  } catch (e) {
    console.error("[publish-bts-musculosa] skipped:", e.message);
  } finally {
    await prisma.$disconnect();
  }
})();
