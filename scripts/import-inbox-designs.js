// One-time import of the designs the owner sent on 2026-10-05 (folder seed-designs/): they go into a new collection
// "Streetwear" (section Streetwear) as UNPUBLISHED designs with origin "sin confirmar" and a note on why each one needs checking. Nothing
// here shows on the store: the owner reviews them in Admin > Colecciones > Streetwear, sets each one's origin and
// publishes (Mostrar) only the ones that are cleared. Guarded by a marker row; nothing here ever blocks startup.
const fs = require("fs");
const path = require("path");
const crypto = require("crypto");
const { PrismaClient } = require("@prisma/client");

const MARKER = "migration.inbox-designs-2026-10-05";

(async () => {
  const prisma = new PrismaClient();
  try {
    if (await prisma.siteText.findUnique({ where: { key: MARKER } })) return;

    const dir = path.join(__dirname, "..", "seed-designs");
    const manifest = JSON.parse(fs.readFileSync(path.join(dir, "manifest.json"), "utf8"));
    const uploads = process.env.UPLOADS_DIR || path.join(process.cwd(), "uploads");
    fs.mkdirSync(uploads, { recursive: true });

    let collection = await prisma.designCollection.findUnique({ where: { slug: "streetwear" } });
    if (!collection) {
      const count = await prisma.designCollection.count();
      collection = await prisma.designCollection.create({ data: { name: "Streetwear", slug: "streetwear", active: true, category: "Streetwear", sortOrder: count } });
    }

    let n = await prisma.presetDesign.count({ where: { collectionId: collection.id } });
    for (const item of manifest) {
      const exists = await prisma.presetDesign.findFirst({ where: { collectionId: collection.id, name: item.name } });
      if (exists) continue;
      const ext = path.extname(item.file);
      const stored = `${crypto.randomUUID()}${ext}`;
      fs.copyFileSync(path.join(dir, item.file), path.join(uploads, stored));
      await prisma.presetDesign.create({
        data: {
          collectionId: collection.id,
          name: item.name,
          imageUrl: `/uploads/${stored}`,
          placement: "FRONT",
          showFront: true,
          showBack: false,
          sortOrder: n++,
          active: false,
          origin: "sin-confirmar",
          sourceNote: `Recibido el 05-10-2026. ${item.note}`,
        },
      });
    }
    console.log(`[inbox-designs] ${manifest.length} designs imported as unpublished`);
    await prisma.siteText.create({ data: { key: MARKER, value: "done" } });
  } catch (e) {
    console.error("[inbox-designs] skipped:", e.message);
  } finally {
    await prisma.$disconnect();
  }
})();
