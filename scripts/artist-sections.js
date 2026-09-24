// One-time: file the four launch artists under the "Reguetón" section (the owner can change or add
// sections from Admin > Colecciones). Guarded by a marker row so later edits are never overwritten.
const { PrismaClient } = require("@prisma/client");

const MARKER = "migration.artist-sections";

(async () => {
  const prisma = new PrismaClient();
  try {
    if (await prisma.siteText.findUnique({ where: { key: MARKER } })) return;
    const r = await prisma.designCollection.updateMany({
      where: { slug: { in: ["karol-g", "bad-bunny", "kidd-voodoo", "cris-mj"] }, category: "" },
      data: { category: "Reguetón" },
    });
    await prisma.siteText.create({ data: { key: MARKER, value: "done" } });
    console.log(`[sections] filed ${r.count} artists under Reguetón`);
  } catch (e) {
    console.error("[sections] skipped:", e.message);
  } finally {
    await prisma.$disconnect();
  }
})();
