// One-time, asked by the owner (07-10-2026): the BTS collection's cover (homepage carousel and the top of its page) is the
// "BTS World Tour Arirang" art on its white background (public/collections/bts-cover.webp). Only an empty cover is set, so a
// photo the owner uploaded later is never replaced. Waits for the collection; marker-guarded; never blocks startup.
const { PrismaClient } = require("@prisma/client");

const MARKER = "migration.bts-cover-2026-10-07";

(async () => {
  const prisma = new PrismaClient();
  try {
    if (await prisma.siteText.findUnique({ where: { key: MARKER } })) return;
    const c = await prisma.designCollection.findUnique({ where: { slug: "bts" } });
    if (!c) return;
    if (!c.photoUrl) await prisma.designCollection.update({ where: { id: c.id }, data: { photoUrl: "/collections/bts-cover.webp" } });
    console.log("[bts-cover] cover set");
    await prisma.siteText.create({ data: { key: MARKER, value: "done" } });
  } catch (e) {
    console.error("[bts-cover] skipped:", e.message);
  } finally {
    await prisma.$disconnect();
  }
})();
