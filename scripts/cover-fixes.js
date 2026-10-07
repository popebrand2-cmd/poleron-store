// One-time covers (owner, 07-10-2026): Karol G goes back to her own photo (/collections/karol-g.jpg; its cover had fallen back
// to the first design, the blue lettering) and BTS gets the re-framed World Tour Arirang art (bts-cover-v2.webp: bigger, less
// white above). A cover the owner set by hand is never replaced. Marker-guarded; never blocks startup.
const { PrismaClient } = require("@prisma/client");

const MARKER = "migration.cover-fixes-2026-10-07";

(async () => {
  const prisma = new PrismaClient();
  try {
    if (await prisma.siteText.findUnique({ where: { key: MARKER } })) return;
    const karol = await prisma.designCollection.findUnique({ where: { slug: "karol-g" } });
    if (karol && !karol.photoUrl) await prisma.designCollection.update({ where: { id: karol.id }, data: { photoUrl: "/collections/karol-g.jpg" } });
    const bts = await prisma.designCollection.findUnique({ where: { slug: "bts" } });
    // BTS may not exist yet on a first start (the import runs just before): only then try again next start
    if (!bts && (await prisma.siteText.count({ where: { key: "migration.import-bts-2026-10-07" } })) === 0) return;
    if (bts && (!bts.photoUrl || bts.photoUrl === "/collections/bts-cover.webp")) {
      await prisma.designCollection.update({ where: { id: bts.id }, data: { photoUrl: "/collections/bts-cover-v2.webp" } });
    }
    console.log("[cover-fixes] covers updated");
    await prisma.siteText.create({ data: { key: MARKER, value: "done" } });
  } catch (e) {
    console.error("[cover-fixes] skipped:", e.message);
  } finally {
    await prisma.$disconnect();
  }
})();
