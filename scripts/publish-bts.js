// One-time, asked by the owner (07-10-2026): publish the 8 BTS designs, and print "Ojos BTS" only on the back (on the chest
// it turns into an unreadable stripe). They keep origin "sin confirmar" with a note that publishing was the owner's decision.
// Waits for the imports to exist (marker not written until the collection has all 8); never blocks startup.
const { PrismaClient } = require("@prisma/client");

const MARKER = "migration.publish-bts-2026-10-07";

(async () => {
  const prisma = new PrismaClient();
  try {
    if (await prisma.siteText.findUnique({ where: { key: MARKER } })) return;
    const collection = await prisma.designCollection.findUnique({ where: { slug: "bts" } });
    if (!collection) return;
    const rows = await prisma.presetDesign.findMany({ where: { collectionId: collection.id, sourceNote: { startsWith: "Recibido el 07-10-2026" } } });
    if (rows.length < 8) return; // the second import has not run yet: try again on the next start
    for (const d of rows) {
      const data = { active: true, sourceNote: `${d.sourceNote} Publicado por decisión del dueño el 07-10-2026.` };
      if (d.name === "Ojos BTS") Object.assign(data, { showFront: false, showBack: true, placement: "BACK" });
      await prisma.presetDesign.update({ where: { id: d.id }, data });
    }
    await prisma.designCollection.update({ where: { id: collection.id }, data: { active: true } });
    console.log(`[publish-bts] ${rows.length} designs published`);
    await prisma.siteText.create({ data: { key: MARKER, value: "done" } });
  } catch (e) {
    console.error("[publish-bts] skipped:", e.message);
  } finally {
    await prisma.$disconnect();
  }
})();
