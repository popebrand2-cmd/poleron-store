// One-time: the redesigned Colecciones section uses "Explore POPE" / "Colecciones" as its eyebrow and
// title, but the previous wording is saved in the database and would keep overriding the new
// defaults. Guarded by a marker row so later edits made by the owner are never overwritten.
const { PrismaClient } = require("@prisma/client");

const MARKER = "migration.collections-texts";

(async () => {
  const prisma = new PrismaClient();
  try {
    if (await prisma.siteText.findUnique({ where: { key: MARKER } })) return;
    for (const [key, value] of [
      ["collections.eyebrow", "Explore POPE"],
      ["collections.heading", "Colecciones"],
    ]) {
      await prisma.siteText.upsert({ where: { key }, update: { value }, create: { key, value } });
    }
    await prisma.siteText.create({ data: { key: MARKER, value: "done" } });
    console.log("[collections-texts] updated the section title texts");
  } catch (e) {
    console.error("[collections-texts] skipped:", e.message);
  } finally {
    await prisma.$disconnect();
  }
})();
