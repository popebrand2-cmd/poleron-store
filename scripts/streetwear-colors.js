// One-time: the light designs imported into Streetwear (white/very light art) disappear on white garments, so they are
// limited to dark garments. The owner can change it per design in Admin > Colecciones (menu "Negras y blancas").
// Guarded by a marker row; nothing here ever blocks startup.
const { PrismaClient } = require("@prisma/client");

const MARKER = "migration.streetwear-colors";
const LIGHT = ["Driver", "Assassin Doll", "Boceto con gorra", "Rayo", "Calavera huesos", "WAR"];

(async () => {
  const prisma = new PrismaClient();
  try {
    if (await prisma.siteText.findUnique({ where: { key: MARKER } })) return;
    const collection = await prisma.designCollection.findUnique({ where: { slug: "streetwear" } });
    // The import runs just before this one at startup; if the collection is not there yet, try again next start.
    if (!collection) return;
    const r = await prisma.presetDesign.updateMany({ where: { collectionId: collection.id, name: { in: LIGHT }, garmentColors: "" }, data: { garmentColors: "negro" } });
    console.log(`[streetwear-colors] ${r.count} light designs limited to dark garments`);
    await prisma.siteText.create({ data: { key: MARKER, value: "done" } });
  } catch (e) {
    console.error("[streetwear-colors] skipped:", e.message);
  } finally {
    await prisma.$disconnect();
  }
})();
