// One-time, asked by the owner (11-10-2026): the "BTS World Tour Arirang" art in its white-and-red version, to sell on BLACK
// garments (the first version, in black ink, only reads on white ones). The picture the owner sent (light art on a black
// background) was cut out to a transparent PNG and cropped (seed-designs/bts/). It is published right away, limited to dark
// garments, with origin "sin confirmar" and a note that publishing was the owner's decision. Marker-guarded; never blocks startup.
const fs = require("fs");
const path = require("path");
const crypto = require("crypto");
const { PrismaClient } = require("@prisma/client");

const MARKER = "migration.import-bts-3-2026-10-11";

(async () => {
  const prisma = new PrismaClient();
  try {
    if (await prisma.siteText.findUnique({ where: { key: MARKER } })) return;

    const dir = path.join(__dirname, "..", "seed-designs", "bts");
    const manifest = JSON.parse(fs.readFileSync(path.join(dir, "manifest-3.json"), "utf8"));
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
          active: true,
          origin: "sin-confirmar",
          sourceNote: `Recibido el 11-10-2026. ${item.note} Publicado por decisión del dueño el 11-10-2026.`,
          garmentColors: item.tone ?? "negro",
        },
      });
    }
    console.log(`[import-bts-3] ${manifest.length} design(s) imported and published for black garments`);
    await prisma.siteText.create({ data: { key: MARKER, value: "done" } });
  } catch (e) {
    console.error("[import-bts-3] skipped:", e.message);
  } finally {
    await prisma.$disconnect();
  }
})();
