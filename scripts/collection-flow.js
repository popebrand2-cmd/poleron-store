// One-time setup for the "card = ready design, + Personalizar = blank garment" flow:
//  1. Publishes the Karol G design that the finished mockups show ("No me arrepiento de sentir tanto", front + back art,
//     shipped in public/designs/karol-g) as the FIRST design of that collection, so the mockup cards open the product with
//     that very design on the front and the back.
//  2. The homepage section that shows the blank base garments said "Lo más buscado"; it now invites to personalize
//     one's own. Only text still equal to the old default is replaced, so wording the owner wrote is never touched.
// Guarded by a marker row; a missing collection is skipped and nothing here ever blocks startup.
const { PrismaClient } = require("@prisma/client");

const MARKER = "migration.collection-flow";

(async () => {
  const prisma = new PrismaClient();
  try {
    if (await prisma.siteText.findUnique({ where: { key: MARKER } })) return;

    const collection = await prisma.designCollection.findUnique({ where: { slug: "karol-g" } });
    if (collection) {
      const exists = await prisma.presetDesign.findFirst({ where: { collectionId: collection.id, imageUrl: "/designs/karol-g/frente.png" } });
      if (!exists) {
        await prisma.presetDesign.create({
          data: {
            collectionId: collection.id,
            name: "No me arrepiento de sentir tanto",
            imageUrl: "/designs/karol-g/frente.png",
            backImageUrl: "/designs/karol-g/espalda.png",
            placement: "FRONT",
            sortOrder: -1,
            showFront: true,
            showBack: true,
            frontScale: 0.75,
            backScale: 1,
          },
        });
        console.log("[collection-flow] Karol G design published");
      }
    }

    const heading = await prisma.siteText.findUnique({ where: { key: "featured.heading" } });
    if (heading && /^\s*lo m[aá]s buscado\s*$/i.test(heading.value)) {
      await prisma.siteText.update({ where: { key: "featured.heading" }, data: { value: "Personaliza el tuyo con estas prendas" } });
    }

    await prisma.siteText.create({ data: { key: MARKER, value: "done" } });
  } catch (e) {
    console.error("[collection-flow] skipped:", e.message);
  } finally {
    await prisma.$disconnect();
  }
})();
