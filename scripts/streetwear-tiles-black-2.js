// One-time, asked by the owner: black tile background for five more Streetwear designs, sent by the owner as screenshots.
// (Done by hand it is: Admin > Colecciones > Streetwear > the design's color circles > Negro.) Marker-guarded.
const { PrismaClient } = require("@prisma/client");

const MARKER = "migration.streetwear-tiles-black-2";
const NAMES = ["La Creación de Adán", "Rostro gritando", "Passenger Princess", "Tres en el barrio", "Skin Culture Just Work Hard"];

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
