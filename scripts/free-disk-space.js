// Self-healing guard that runs first on every start. When the volume is nearly full (the reason
// customers couldn't upload photos: "ENOSPC: no space left on device"), it deletes uploaded files
// that nothing references any more and are older than KEEP_DAYS — the same safe rule as
// Admin > Almacenamiento. With enough free space it does nothing.
const fs = require("fs");
const path = require("path");
const { PrismaClient } = require("@prisma/client");

const KEEP_DAYS = 3;
const MIN_FREE_BYTES = 150 * 1024 * 1024;
const dir = process.env.UPLOADS_DIR || path.join(process.cwd(), "uploads");
const mb = (b) => (b / 1048576).toFixed(1) + " MB";

(async () => {
  const prisma = new PrismaClient();
  try {
    const st = fs.statfsSync(dir);
    const free = st.bavail * st.bsize;
    console.log(`[disk] ${mb(free)} free of ${mb(st.blocks * st.bsize)}`);
    if (free >= MIN_FREE_BYTES) return;

    const urls = new Set();
    const add = (u) => {
      if (u && u.startsWith("/uploads/")) urls.add(u.slice("/uploads/".length));
    };
    for (const v of await prisma.productView.findMany({ select: { imageUrl: true } })) add(v.imageUrl);
    for (const p of await prisma.presetDesign.findMany({ select: { imageUrl: true } })) add(p.imageUrl);
    const settings = await prisma.storeSettings.findUnique({ where: { id: "singleton" }, select: { heroImageUrl: true } });
    if (settings) add(settings.heroImageUrl);
    const texts = await prisma.siteText.findMany({ where: { OR: [{ key: { startsWith: "image." } }, { key: { startsWith: "video." } }] }, select: { value: true } });
    for (const t of texts) add(t.value);
    for (const oi of await prisma.orderItem.findMany({ select: { previewImageUrl: true, designPlacement: true } })) {
      add(oi.previewImageUrl);
      try {
        for (const view of Object.values(JSON.parse(oi.designPlacement))) {
          add(view && view.designUrl);
          add(view && view.originalDesignUrl);
        }
      } catch {}
    }

    const cutoff = Date.now() - KEEP_DAYS * 86400000;
    let deleted = 0;
    let freed = 0;
    for (const name of fs.readdirSync(dir)) {
      const full = path.join(dir, name);
      const s = fs.statSync(full);
      if (!s.isFile() || urls.has(name) || s.mtimeMs >= cutoff) continue;
      fs.unlinkSync(full);
      deleted++;
      freed += s.size;
    }
    console.log(`[disk] low space: deleted ${deleted} unused files, freed ${mb(freed)}`);
  } catch (e) {
    console.error("[disk] skipped:", e.message);
  } finally {
    await prisma.$disconnect();
  }
})();
