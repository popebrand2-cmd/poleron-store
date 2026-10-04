// One-time setup of the store's social links (Instagram popebrand.cl, Facebook page). The floating social buttons and
// the footer only show a network once it has a link. Only an empty link is filled in, so one the owner typed in the
// editor is never touched. Each link has its own marker row; nothing here ever blocks startup.
const { PrismaClient } = require("@prisma/client");

const LINKS = [
  { marker: "migration.social-links", key: "setting.instagramUrl", url: "https://www.instagram.com/popebrand.cl/" },
  { marker: "migration.social-links-facebook", key: "setting.facebookUrl", url: "https://www.facebook.com/profile.php?id=61595132849372" },
];

(async () => {
  const prisma = new PrismaClient();
  try {
    for (const { marker, key, url } of LINKS) {
      if (await prisma.siteText.findUnique({ where: { key: marker } })) continue;
      const row = await prisma.siteText.findUnique({ where: { key } });
      if (!row) await prisma.siteText.create({ data: { key, value: url } });
      else if (!row.value.trim()) await prisma.siteText.update({ where: { key }, data: { value: url } });
      await prisma.siteText.create({ data: { key: marker, value: "done" } });
    }
  } catch (e) {
    console.error("[social-links] skipped:", e.message);
  } finally {
    await prisma.$disconnect();
  }
})();
