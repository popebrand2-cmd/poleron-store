// One-time, asked by the owner: black tile background for the last two Streetwear designs still on light grey.
// (Done by hand it is: Admin > Colecciones > Streetwear > the design's color circles > Negro.) Marker-guarded.
const { PrismaClient } = require("@prisma/client");

const MARKER = "migration.streetwear-tiles-black-3";
const NAMES = ["Mano con brazalete", "Rick con hojas"];

(async () => {
  const prisma = new PrismaClient();
  try {
    if (await prisma.siteText.findUnique({ where: { key: MARKER } })) return;
    const collection = await prisma.designCollection.findUnique({ where: { slug: "streetwear" } });
    if (!collection) return;
    const r = await prisma.presetDesign.updateMany({ where: { collectionId: collection.id, name: { in: NAMES } }, data: { tileBg: "#0a0a0a" } });
    console.log(`[streetwear-tiles-black] ${r.count} tiles set to black`);
    await prisma.siteText.create({ data: { key: MARKER, value: "done" } });
  } catch (e) {
    console.error("[streetwear-tiles-black] skipped:", e.message);
  } finally {
    await prisma.$disconnect();
  }
})();
