// One-time: creates the exclusive "Musculosa BTS" as an UNPUBLISHED draft (limited edition, seven versions: one picture per
// member, front and back). Price, units and closing date are left for the owner to fill in (Admin > Productos > Musculosa BTS)
// before publishing: price 0 on purpose, and the checkout refuses products without a price. Guarded by a marker row.
const fs = require("fs");
const path = require("path");
const crypto = require("crypto");
const { PrismaClient } = require("@prisma/client");

const MARKER = "migration.import-bts-musculosa-2026-10-07";

(async () => {
  const prisma = new PrismaClient();
  try {
    if (await prisma.siteText.findUnique({ where: { key: MARKER } })) return;
    if (await prisma.product.findUnique({ where: { slug: "musculosa-bts" } })) {
      await prisma.siteText.create({ data: { key: MARKER, value: "exists" } });
      return;
    }
    const dir = path.join(__dirname, "..", "seed-designs", "exclusive");
    const manifest = JSON.parse(fs.readFileSync(path.join(dir, "manifest.json"), "utf8"));
    const uploads = process.env.UPLOADS_DIR || path.join(process.cwd(), "uploads");
    fs.mkdirSync(uploads, { recursive: true });

    const colors = manifest.map((m, i) => {
      const stored = `${crypto.randomUUID()}${path.extname(m.file)}`;
      fs.copyFileSync(path.join(dir, m.file), path.join(uploads, stored));
      return {
        name: m.name,
        hex: "#111111",
        sortOrder: i,
        views: {
          create: [{ label: "Frente y espalda", imageUrl: `/uploads/${stored}`, sortOrder: 0, zoneXPct: 30, zoneYPct: 30, zoneWidthPct: 40, zoneHeightPct: 40, maxWidthCm: 20, maxHeightCm: 20, allowRotate: false }],
        },
      };
    });

    await prisma.product.create({
      data: {
        slug: "musculosa-bts",
        name: "Musculosa BTS",
        description: "Musculosa deportiva negra, edición limitada. Elige tu versión y tu talla: no se personaliza.",
        basePrice: 0,
        active: false,
        limitedEdition: true,
        limitedUnits: 0,
        limitedUntil: null,
        sizes: { create: ["S", "M", "L", "XL"].map((label, i) => ({ label, sortOrder: i, priceDelta: 0 })) },
        materials: { create: [{ label: "Tela deportiva", sortOrder: 0, priceDelta: 0 }] },
        colors: { create: colors },
      },
    });
    console.log(`[bts-musculosa] draft created with ${colors.length} versions`);
    await prisma.siteText.create({ data: { key: MARKER, value: "done" } });
  } catch (e) {
    console.error("[bts-musculosa] skipped:", e.message);
  } finally {
    await prisma.$disconnect();
  }
})();
