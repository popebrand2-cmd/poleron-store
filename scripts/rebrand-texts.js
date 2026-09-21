// One-time, idempotent data fix: the homepage texts saved in the database
// before the rebrand still start with "MAD ·". Rewrites them to "POPE ·".
// Safe to run on every start — once nothing matches, it does nothing.
const { PrismaClient } = require("@prisma/client");

(async () => {
  const prisma = new PrismaClient();
  try {
    const texts = await prisma.siteText.findMany({ where: { value: { startsWith: "MAD ·" } } });
    for (const t of texts) {
      await prisma.siteText.update({ where: { key: t.key }, data: { value: t.value.replace(/^MAD ·/, "POPE ·") } });
    }
    const settings = await prisma.storeSettings.findUnique({ where: { id: "singleton" } });
    if (settings && settings.heroEyebrow.startsWith("MAD ·")) {
      await prisma.storeSettings.update({
        where: { id: "singleton" },
        data: { heroEyebrow: settings.heroEyebrow.replace(/^MAD ·/, "POPE ·") },
      });
    }
    console.log(`[rebrand] updated ${texts.length} site texts`);
  } catch (e) {
    console.error("[rebrand] skipped:", e.message);
  } finally {
    await prisma.$disconnect();
  }
})();
