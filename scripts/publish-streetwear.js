// One-time: the owner asked to publish all 17 designs imported into Streetwear (05-10-2026). They keep their origin
// "sin confirmar" (the record stays truthful) but become visible, with a note that it was the owner's decision.
// Guarded by a marker row; waits for the import to exist; nothing here ever blocks startup.
const { PrismaClient } = require("@prisma/client");

const MARKER = "migration.publish-streetwear-2026-10-05";

(async () => {
  const prisma = new PrismaClient();
  try {
    if (await prisma.siteText.findUnique({ where: { key: MARKER } })) return;
    const collection = await prisma.designCollection.findUnique({ where: { slug: "streetwear" } });
    if (!collection) return;
    const rows = await prisma.presetDesign.findMany({ where: { collectionId: collection.id, sourceNote: { startsWith: "Recibido el 05-10-2026" } } });
    for (const d of rows) {
      await prisma.presetDesign.update({ where: { id: d.id }, data: { active: true, sourceNote: `${d.sourceNote} Publicado por decisión del dueño el 05-10-2026.` } });
    }
    await prisma.designCollection.update({ where: { id: collection.id }, data: { active: true } });
    console.log(`[publish-streetwear] ${rows.length} designs published`);
    await prisma.siteText.create({ data: { key: MARKER, value: "done" } });
  } catch (e) {
    console.error("[publish-streetwear] skipped:", e.message);
  } finally {
    await prisma.$disconnect();
  }
})();
