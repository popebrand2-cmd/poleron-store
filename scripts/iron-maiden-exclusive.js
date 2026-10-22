// One-time, asked by the owner (21-10-2026): the exclusive "Polera Iron Maiden – Run For Your Lives" goes on sale at $11.999,
// sizes M, L and XL, one version (black, front and back on one picture). No unit cap and no closing date are invented: the
// counter and the countdown appear once the owner sets them in Admin > Productos. The Eddie crest of the shirt becomes the
// logo of the floating "Exclusive" button (only when the owner has not set another one). Marker-guarded; never blocks startup.
const fs = require("fs");
const path = require("path");
const crypto = require("crypto");
const { PrismaClient } = require("@prisma/client");

const MARKER = "migration.iron-maiden-exclusive-2026-10-21";
const SLUG = "polera-iron-maiden";

const DESCRIPTION =
  "El heavy metal no se escucha, se lleva en la sangre. Una polera con toda la esencia de Iron Maiden, inspirada en la energía de sus conciertos y pensada para verdaderos fanáticos: Eddie delante y el 26 en la espalda. " +
  "Diseño full color delante y en la espalda, sublimación de alta definición integrada a la tela, con colores intensos. Tela 100% poliéster, ligera, transpirable y resistente para el uso diario. Corte normal (regular fit). " +
  "Edición limitada: llega tal como la ves, no se personaliza. Up the Irons!";

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
    if (await prisma.siteText.findUnique({ where: { key: MARKER } })) return;
    const dir = path.join(__dirname, "..", "seed-designs", "exclusive", "iron-maiden");

    if (!(await prisma.product.findUnique({ where: { slug: SLUG } }))) {
      const image = copyToUploads(path.join(dir, "run-for-your-lives.webp"));
      await prisma.product.create({
        data: {
          slug: SLUG,
          name: "Polera Iron Maiden – Run For Your Lives",
          description: DESCRIPTION,
          basePrice: 11999,
          active: true,
          limitedEdition: true,
          limitedUnits: 0,
          limitedUntil: null,
          sizes: { create: ["M", "L", "XL"].map((label, i) => ({ label, sortOrder: i, priceDelta: 0 })) },
          materials: { create: [{ label: "100% poliéster sublimado", sortOrder: 0, priceDelta: 0 }] },
          colors: {
            create: [
              {
                name: "Negro",
                hex: "#111111",
                sortOrder: 0,
                views: {
                  create: [{ label: "Frente y espalda", imageUrl: image, sortOrder: 0, zoneXPct: 30, zoneYPct: 30, zoneWidthPct: 40, zoneHeightPct: 40, maxWidthCm: 20, maxHeightCm: 20, allowRotate: false }],
                },
              },
            ],
          },
        },
      });
      console.log("[iron-maiden-exclusive] on sale at $11.999 (M, L, XL)");
    }

    const logo = await prisma.siteText.findUnique({ where: { key: "image.exclusiveLogo" } });
    if (!logo || !logo.value) {
      const url = copyToUploads(path.join(dir, "logo.webp"));
      await prisma.siteText.upsert({ where: { key: "image.exclusiveLogo" }, create: { key: "image.exclusiveLogo", value: url }, update: { value: url } });
      console.log("[iron-maiden-exclusive] Exclusive button logo set");
    }

    await prisma.siteText.create({ data: { key: MARKER, value: "done" } });
  } catch (e) {
    console.error("[iron-maiden-exclusive] skipped:", e.message);
  } finally {
    await prisma.$disconnect();
  }
})();
