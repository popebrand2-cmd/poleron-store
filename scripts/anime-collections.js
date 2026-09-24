// One-time: publishes the anime collections requested by the owner in the "Anime" section. Each anime is
// its own collection (its page lists that collection's designs); the FIRST design is the cover image.
// Guarded by a marker row so later edits in Admin > Colecciones are never redone. If the database can't
// be written nothing is marked, so it simply retries on the next start.
const { PrismaClient } = require("@prisma/client");

const MARKER = "migration.anime-collections";
const ANIME = [
  { slug: "one-piece", name: "One Piece" },
  { slug: "dragon-ball-z", name: "Dragon Ball Z" },
  { slug: "pokemon", name: "Pokémon" },
  { slug: "naruto", name: "Naruto" },
  { slug: "demon-slayer", name: "Demon Slayer" },
  { slug: "attack-on-titan", name: "Attack on Titan" },
  { slug: "hunter-x-hunter", name: "Hunter x Hunter" },
  { slug: "fullmetal-alchemist", name: "Fullmetal Alchemist" },
  { slug: "my-hero-academia", name: "My Hero Academia" },
];

(async () => {
  const prisma = new PrismaClient();
  try {
    if (await prisma.siteText.findUnique({ where: { key: MARKER } })) return;
    const base = await prisma.designCollection.count();
    for (const [i, a] of ANIME.entries()) {
      let collection = await prisma.designCollection.findUnique({ where: { slug: a.slug } });
      if (!collection) {
        collection = await prisma.designCollection.create({ data: { slug: a.slug, name: a.name, category: "Anime", sortOrder: base + i } });
      }
      const exists = await prisma.presetDesign.findFirst({ where: { collectionId: collection.id } });
      if (!exists) {
        await prisma.presetDesign.create({
          data: { collectionId: collection.id, name: a.name, imageUrl: `/collections/${a.slug}.jpg`, placement: "FRONT", sortOrder: 0 },
        });
      }
    }
    await prisma.siteText.create({ data: { key: MARKER, value: "done" } });
    console.log(`[anime] published ${ANIME.length} anime collections`);
  } catch (e) {
    console.error("[anime] skipped:", e.message);
  } finally {
    await prisma.$disconnect();
  }
})();
