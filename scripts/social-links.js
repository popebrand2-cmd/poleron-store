// One-time setup: the store's Instagram link (instagram.com/popebrand.cl). The floating social buttons and the footer
// only show a network once it has a link, so Instagram never appeared. Only an empty link is filled in, so one the
// owner typed in the editor is never touched. Facebook has no verified address yet: the owner pastes it in the editor.
// Guarded by a marker row; nothing here ever blocks startup.
const { PrismaClient } = require("@prisma/client");

const MARKER = "migration.social-links";

(async () => {
  const prisma = new PrismaClient();
  try {
    if (await prisma.siteText.findUnique({ where: { key: MARKER } })) return;

    const key = "setting.instagramUrl";
    const row = await prisma.siteText.findUnique({ where: { key } });
    if (!row) await prisma.siteText.create({ data: { key, value: "https://www.instagram.com/popebrand.cl/" } });
    else if (!row.value.trim()) await prisma.siteText.update({ where: { key }, data: { value: "https://www.instagram.com/popebrand.cl/" } });

    await prisma.siteText.create({ data: { key: MARKER, value: "done" } });
  } catch (e) {
    console.error("[social-links] skipped:", e.message);
  } finally {
    await prisma.$disconnect();
  }
})();
