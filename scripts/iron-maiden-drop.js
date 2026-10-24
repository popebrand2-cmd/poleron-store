// The Iron Maiden exclusive drop (asked by the owner, 24-10-2026): one black tee per design in
// seed-designs/exclusive/iron-maiden/manifest.json, $11.999, sizes S to 3XL, the big print on the FRONT only. The back is free:
// the customer can add their own design there for $6.000 more ($17.999), as a second "material" option — the checkout
// charges it whenever a back design comes with the piece. The back photo and print zone are the store's black tee
// (tee-oversize, "Negro", "Espalda"). One marker per design, so adding a design to the manifest adds it on the next start
// without touching the others (and a piece the owner deletes is not brought back). Never blocks startup.
const fs = require("fs");
const path = require("path");
const crypto = require("crypto");
const { PrismaClient } = require("@prisma/client");

const SIZES = ["S", "M", "L", "XL", "2XL", "3XL"];
const PRICE = 11999;
const BACK_EXTRA = 6000;
const FRONT_ONLY = "Estampado adelante";
const WITH_BACK = "Adelante + tu diseño atrás";

function copyToUploads(file) {
  const uploads = process.env.UPLOADS_DIR || path.join(process.cwd(), "uploads");
  fs.mkdirSync(uploads, { recursive: true });
  const stored = `${crypto.randomUUID()}${path.extname(file)}`;
  fs.copyFileSync(file, path.join(uploads, stored));
  return `/uploads/${stored}`;
}

(async () => {
  const prisma = new PrismaClient();
  try {
    const dir = path.join(__dirname, "..", "seed-designs", "exclusive", "iron-maiden");
    const manifest = JSON.parse(fs.readFileSync(path.join(dir, "manifest.json"), "utf8"));

    // The back of the store's black tee: where the customer's own design goes.
    const tee = await prisma.product.findFirst({
      where: { OR: [{ slug: "tee-oversize" }, { name: { contains: "Polera" }, limitedEdition: false }] },
      include: { colors: { include: { views: true } } },
      orderBy: { createdAt: "asc" },
    });
    const black = tee?.colors.find((c) => /negro/i.test(c.name)) ?? null;
    const back = black?.views.find((v) => v.label === "Espalda") ?? null;

    for (const m of manifest) {
      const marker = `migration.iron-drop.${m.slug}`;
      if (await prisma.siteText.findUnique({ where: { key: marker } })) continue;
      if (!(await prisma.product.findUnique({ where: { slug: m.slug } }))) {
        const mockup = copyToUploads(path.join(dir, m.mockup));
        const views = [{ label: "Frente", imageUrl: mockup, sortOrder: 0, zoneXPct: 30, zoneYPct: 25, zoneWidthPct: 40, zoneHeightPct: 50, maxWidthCm: 30, maxHeightCm: 40, allowRotate: false }];
        if (back) {
          views.push({
            label: "Espalda",
            imageUrl: back.imageUrl,
            sortOrder: 1,
            zoneXPct: back.zoneXPct,
            zoneYPct: back.zoneYPct,
            zoneWidthPct: back.zoneWidthPct,
            zoneHeightPct: back.zoneHeightPct,
            maxWidthCm: back.maxWidthCm,
            maxHeightCm: back.maxHeightCm,
            allowRotate: false,
          });
        }
        await prisma.product.create({
          data: {
            slug: m.slug,
            name: m.name,
            description:
              `${m.blurb} Polera negra con el estampado grande adelante; la espalda va lisa, o con tu propio diseño por $6.000 más. ` +
              "Edición exclusiva de Iron Maiden: solo en POPE. Tallas S a 3XL. Up the Irons!",
            basePrice: PRICE,
            active: true,
            limitedEdition: true,
            limitedUnits: 0,
            limitedUntil: null,
            sizes: { create: SIZES.map((label, i) => ({ label, sortOrder: i, priceDelta: 0 })) },
            materials: {
              create: back
                ? [
                    { label: FRONT_ONLY, sortOrder: 0, priceDelta: 0 },
                    { label: WITH_BACK, sortOrder: 1, priceDelta: BACK_EXTRA },
                  ]
                : [{ label: FRONT_ONLY, sortOrder: 0, priceDelta: 0 }],
            },
            colors: { create: [{ name: "Negro", hex: "#111111", sortOrder: 0, views: { create: views } }] },
          },
        });
        console.log(`[iron-maiden-drop] ${m.name} on sale at $11.999`);
      }
      await prisma.siteText.create({ data: { key: marker, value: "done" } });
    }
  } catch (e) {
    console.error("[iron-maiden-drop] skipped:", e.message);
  } finally {
    await prisma.$disconnect();
  }
})();
