// One-time data change requested by the owner: remove the "MAD" designs from the homepage
// collections and publish the "Artistas" collection. Guarded by a marker row so it runs once
// per database — later edits in the admin panel (deleting/renaming designs) are never redone.
const { PrismaClient } = require("@prisma/client");

const MARKER = "migration.artistas-collection";

(async () => {
  const prisma = new PrismaClient();
  try {
    if (await prisma.siteText.findUnique({ where: { key: MARKER } })) return;

    const all = await prisma.presetDesign.findMany();
    const mad = all.filter((d) => /\bmad\b/i.test(d.name));
    if (mad.length) await prisma.presetDesign.deleteMany({ where: { id: { in: mad.map((d) => d.id) } } });

    let collection = await prisma.designCollection.findUnique({ where: { slug: "artistas" } });
    if (!collection) collection = await prisma.designCollection.create({ data: { slug: "artistas", name: "Artistas", sortOrder: 0 } });

    const designs = [
      { name: "Karol G", imageUrl: "/collections/karol-g.jpg" },
      { name: "Bad Bunny", imageUrl: "/collections/bad-bunny.jpg" },
      { name: "Kidd Voodoo", imageUrl: "/collections/kidd-voodoo.jpg" },
    ];
    for (const [i, d] of designs.entries()) {
      const exists = await prisma.presetDesign.findFirst({ where: { collectionId: collection.id, name: d.name } });
      if (!exists) await prisma.presetDesign.create({ data: { ...d, collectionId: collection.id, placement: "FRONT", sortOrder: i } });
    }

    await prisma.siteText.create({ data: { key: MARKER, value: "done" } });
    console.log(`[artistas] removed ${mad.length} MAD designs, published Artistas collection`);
  } catch (e) {
    console.error("[artistas] skipped:", e.message);
  } finally {
    await prisma.$disconnect();
  }
})();
