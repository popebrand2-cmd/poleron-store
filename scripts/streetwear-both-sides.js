// One-time: the Streetwear designs were imported as "front only", which left the back of every garment blank on the
// cards. A small print on the chest and the same art large on the back looks right for streetwear, so they now print on
// both sides (the owner can change it per design in the Design Studio). Guarded by a marker row.
const { PrismaClient } = require("@prisma/client");

const MARKER = "migration.streetwear-both-sides";

(async () => {
  const prisma = new PrismaClient();
  try {
    if (await prisma.siteText.findUnique({ where: { key: MARKER } })) return;
    const collection = await prisma.designCollection.findUnique({ where: { slug: "streetwear" } });
    if (!collection) return;
    const r = await prisma.presetDesign.updateMany({ where: { collectionId: collection.id, sourceNote: { startsWith: "Recibido el 05-10-2026" }, showBack: false, backImageUrl: "" }, data: { showBack: true } });
    console.log(`[streetwear-both-sides] ${r.count} designs now print on the back too`);
    await prisma.siteText.create({ data: { key: MARKER, value: "done" } });
  } catch (e) {
    console.error("[streetwear-both-sides] skipped:", e.message);
  } finally {
    await prisma.$disconnect();
  }
})();
