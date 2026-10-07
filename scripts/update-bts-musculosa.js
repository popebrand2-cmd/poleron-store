// One-time: the owner's technical sheet and size chart for the Musculosa BTS (07-10-2026): description, sizes XS-XXL with
// their measurements (alto = lengthCm, ancho = chestCm, as flat garment measures) and the fabric. The XXL height was hidden in
// the picture the owner sent, so it stays empty ("—") until it is filled in Admin > Productos. Marker-guarded; never blocks startup.
const { PrismaClient } = require("@prisma/client");

const MARKER = "migration.update-bts-musculosa-2026-10-07";
const SIZES = [
  ["XS", 65, 49],
  ["S", 67, 51],
  ["M", 73, 54],
  ["L", 75, 56],
  ["XL", 78, 57],
  ["XXL", null, 59],
];
const DESCRIPTION = [
  "Polera réplica, confección nacional.",
  "Tela DRY FIT / jersey, estilo polera deportiva.",
  "Material: tela sublimada. No se despega: el diseño va impreso directamente en la tela, de alta calidad.",
  "Diseño réplica.",
].join("\n");

(async () => {
  const prisma = new PrismaClient();
  try {
    if (await prisma.siteText.findUnique({ where: { key: MARKER } })) return;
    const p = await prisma.product.findUnique({ where: { slug: "musculosa-bts" } });
    if (!p) return; // the draft is created by the previous step; try again on the next start
    await prisma.$transaction([
      prisma.productSize.deleteMany({ where: { productId: p.id } }),
      prisma.productMaterial.deleteMany({ where: { productId: p.id } }),
      prisma.productSize.createMany({ data: SIZES.map(([label, lengthCm, chestCm], i) => ({ productId: p.id, label, sortOrder: i, priceDelta: 0, lengthCm, chestCm })) }),
      prisma.productMaterial.create({ data: { productId: p.id, label: "Tela sublimada DRY FIT", sortOrder: 0, priceDelta: 0 } }),
      prisma.product.update({ where: { id: p.id }, data: { description: DESCRIPTION } }),
    ]);
    console.log("[update-bts-musculosa] sheet and sizes updated");
    await prisma.siteText.create({ data: { key: MARKER, value: "done" } });
  } catch (e) {
    console.error("[update-bts-musculosa] skipped:", e.message);
  } finally {
    await prisma.$disconnect();
  }
})();
