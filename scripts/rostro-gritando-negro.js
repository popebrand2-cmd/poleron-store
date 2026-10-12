// One-time, asked by the owner (11-10-2026): the "Rostro gritando" design looks bad on white garments (a grey photo on white),
// so it is sold only on black ones: its garment colors are limited to "negro". Marker-guarded; waits until the design exists;
// never blocks startup.
const { PrismaClient } = require("@prisma/client");

const MARKER = "migration.rostro-gritando-negro-2026-10-11";

(async () => {
  const prisma = new PrismaClient();
  try {
    if (await prisma.siteText.findUnique({ where: { key: MARKER } })) return;
    const rows = await prisma.presetDesign.findMany({ where: { name: { contains: "Rostro gritando" } }, select: { id: true } });
    if (rows.length === 0) return; // not there yet: try again on the next start
    const r = await prisma.presetDesign.updateMany({ where: { id: { in: rows.map((x) => x.id) } }, data: { garmentColors: "negro" } });
    console.log(`[rostro-gritando-negro] ${r.count} design(s) limited to black garments`);
    await prisma.siteText.create({ data: { key: MARKER, value: "done" } });
  } catch (e) {
    console.error("[rostro-gritando-negro] skipped:", e.message);
  } finally {
    await prisma.$disconnect();
  }
})();
