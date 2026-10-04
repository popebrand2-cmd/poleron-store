// One-time: the three main products were still named in English ("Tee Oversize", "Hoodie Oversize",
// "Hoodie Boxifit") on the homepage, cart and product pages, while the collection pages call them
// "Polera", "Polerón oversize" and "Polerón boxifit" — customers read them as different products.
// Renames them to the Spanish names, but only while they still carry the original English name, so a
// name the owner has already changed in Admin > Productos is never touched. Guarded by a marker row;
// a missing product is skipped and nothing here ever blocks startup.
const { PrismaClient } = require("@prisma/client");

const MARKER = "migration.spanish-names";
const RENAMES = [
  { slug: "tee-oversize", from: "tee oversize", to: "Polera Oversize" },
  { slug: "hoodie-oversize", from: "hoodie oversize", to: "Polerón Oversize" },
  { slug: "hoodie-boxifit", from: "hoodie boxifit", to: "Polerón Boxifit" },
];

(async () => {
  const prisma = new PrismaClient();
  try {
    if (await prisma.siteText.findUnique({ where: { key: MARKER } })) return;
    let n = 0;
    for (const { slug, from, to } of RENAMES) {
      const product = await prisma.product.findUnique({ where: { slug } });
      if (!product || product.name.trim().toLowerCase() !== from) continue;
      await prisma.product.update({ where: { id: product.id }, data: { name: to } });
      n++;
    }
    await prisma.siteText.create({ data: { key: MARKER, value: "done" } });
    console.log(`[spanish-names] renamed ${n} product(s)`);
  } catch (e) {
    console.error("[spanish-names] skipped:", e.message);
  } finally {
    await prisma.$disconnect();
  }
})();
