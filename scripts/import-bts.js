// One-time: opens the BTS collection (section Artistas) with the designs the owner sent on 2026-10-07 (seed-designs/bts/),
// already cleaned up (white background removed, cropped, doubled in size). They are saved UNPUBLISHED with origin "sin
// confirmar" and a note about the rights involved; the owner publishes them with "Mostrar" in Admin > Colecciones > BTS.
// The art is dark on white, so it is limited to light garments. Guarded by a marker row; never blocks startup.
const fs = require("fs");
const path = require("path");
const crypto = require("crypto");
const { PrismaClient } = require("@prisma/client");

const MARKER = "migration.import-bts-2026-10-07";

(async () => {
  const prisma = new PrismaClient();
  try {
    if (await prisma.siteText.findUnique({ where: { key: MARKER } })) return;

    const dir = path.join(__dirname, "..", "seed-designs", "bts");
    const manifest = JSON.parse(fs.readFileSync(path.join(dir, "manifest.json"), "utf8"));
    const uploads = process.env.UPLOADS_DIR || path.join(process.cwd(), "uploads");
    fs.mkdirSync(uploads, { recursive: true });

    let collection = await prisma.designCollection.findUnique({ where: { slug: "bts" } });
    if (!collection) {
      const count = await prisma.designCollection.count();
      collection = await prisma.designCollection.create({ data: { name: "BTS", slug: "bts", active: true, category: "Artistas", sortOrder: count } });
    }

    let n = await prisma.presetDesign.count({ where: { collectionId: collection.id } });
    for (const item of manifest) {
      if (await prisma.presetDesign.findFirst({ where: { collectionId: collection.id, name: item.name } })) continue;
      const stored = `${crypto.randomUUID()}${path.extname(item.file)}`;
      fs.copyFileSync(path.join(dir, item.file), path.join(uploads, stored));
      await prisma.presetDesign.create({
        data: {
          collectionId: collection.id,
          name: item.name,
          imageUrl: `/uploads/${stored}`,
          placement: "FRONT",
          showFront: true,
          showBack: true,
          sortOrder: n++,
          active: false,
          origin: "sin-confirmar",
          sourceNote: `Recibido el 07-10-2026. ${item.note}`,
          garmentColors: "blanco",
        },
      });
    }
    console.log(`[import-bts] ${manifest.length} designs imported as unpublished`);
    await prisma.siteText.create({ data: { key: MARKER, value: "done" } });
  } catch (e) {
    console.error("[import-bts] skipped:", e.message);
  } finally {
    await prisma.$disconnect();
  }
})();
