// One-time: the homepage now shows the sections Artistas / Anime / Navidad / Streetwear / POPE Originals.
// Move the artists that were filed under "Reguetón" (or under no section) into "Artistas". Guarded by
// a marker so later changes made in Admin > Colecciones are never overwritten.
const { PrismaClient } = require("@prisma/client");

const MARKER = "migration.sections-artistas";

(async () => {
  const prisma = new PrismaClient();
  try {
    if (await prisma.siteText.findUnique({ where: { key: MARKER } })) return;
    const r = await prisma.designCollection.updateMany({ where: { category: { in: ["", "Reguetón"] } }, data: { category: "Artistas" } });
    await prisma.siteText.create({ data: { key: MARKER, value: "done" } });
    console.log(`[sections-artistas] moved ${r.count} collections to Artistas`);
  } catch (e) {
    console.error("[sections-artistas] skipped:", e.message);
  } finally {
    await prisma.$disconnect();
  }
})();
