// One-time data change requested by the owner: remove the "MAD" designs and publish the artist
// collections. Each artist is its own collection (its page lists that collection's designs); the
// FIRST design is the artist's cover photo. Guarded by a marker row so it runs once per database —
// later edits in the admin panel are never redone. If the database can't be written (e.g. the disk
// is full) nothing is changed and no marker is saved, so it simply retries on the next start.
const { PrismaClient } = require("@prisma/client");

const MARKER = "migration.artistas-collection";
const ARTISTS = [
  { slug: "karol-g", name: "Karol G", imageUrl: "/collections/karol-g.jpg" },
  { slug: "bad-bunny", name: "Bad Bunny", imageUrl: "/collections/bad-bunny.jpg" },
  { slug: "kidd-voodoo", name: "Kidd Voodoo", imageUrl: "/collections/kidd-voodoo.jpg" },
];

(async () => {
  const prisma = new PrismaClient();
  try {
    if (await prisma.siteText.findUnique({ where: { key: MARKER } })) return;

    const all = await prisma.presetDesign.findMany();
    const mad = all.filter((d) => /\bmad\b/i.test(d.name));
    if (mad.length) await prisma.presetDesign.deleteMany({ where: { id: { in: mad.map((d) => d.id) } } });

    for (const [i, a] of ARTISTS.entries()) {
      let collection = await prisma.designCollection.findUnique({ where: { slug: a.slug } });
      if (!collection) collection = await prisma.designCollection.create({ data: { slug: a.slug, name: a.name, sortOrder: i } });
      const exists = await prisma.presetDesign.findFirst({ where: { collectionId: collection.id } });
      if (!exists) {
        await prisma.presetDesign.create({
          data: { collectionId: collection.id, name: a.name, imageUrl: a.imageUrl, placement: "FRONT", sortOrder: 0 },
        });
      }
    }

    await prisma.siteText.create({ data: { key: MARKER, value: "done" } });
    console.log(`[artistas] removed ${mad.length} MAD designs, published ${ARTISTS.length} artist collections`);
  } catch (e) {
    console.error("[artistas] skipped:", e.message);
  } finally {
    await prisma.$disconnect();
  }
})();
