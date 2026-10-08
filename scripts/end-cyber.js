// One-time, for the day after the Cyber POPE sale (ends 7 de octubre 2026, Chile): puts the three sale products back to their
// regular price (the real "before" price was kept in compareAtPrice by cyber-sale.js) and clears the crossed-out price, so the
// "Ahorra X%" badges and the strikethrough prices disappear from every card and product page. The rotating top-bar message that
// announced the sale is replaced too (only if it still is the Cyber one: a message the owner rewrote is never touched).
// Marker-guarded, does nothing before the sale has ended, and never blocks startup.
const { PrismaClient } = require("@prisma/client");

const MARKER = "migration.end-cyber";
const ENDS_AT = new Date("2026-10-08T02:59:59-03:00"); // same instant as CYBER_ENDS_AT in src/lib/cyber.ts
const SLUGS = ["tee-oversize", "hoodie-oversize", "hoodie-boxifit"];
const NEW_ANNOUNCEMENT = "💎 PIEZA EXCLUSIVA: MUSCULOSA BTS — EDICIÓN LIMITADA, SOLO EN POPE";

(async () => {
  if (Date.now() <= ENDS_AT.getTime()) return;
  const prisma = new PrismaClient();
  try {
    if (await prisma.siteText.findUnique({ where: { key: MARKER } })) return;
    let n = 0;
    for (const slug of SLUGS) {
      const p = await prisma.product.findUnique({ where: { slug } });
      if (!p || p.compareAtPrice == null || p.compareAtPrice <= p.basePrice) continue;
      await prisma.product.update({ where: { id: p.id }, data: { basePrice: p.compareAtPrice, compareAtPrice: null } });
      n++;
    }
    const bar = await prisma.siteText.findUnique({ where: { key: "announce.4" } });
    if (bar && /cyber/i.test(bar.value)) await prisma.siteText.update({ where: { key: "announce.4" }, data: { value: NEW_ANNOUNCEMENT } });
    await prisma.siteText.create({ data: { key: MARKER, value: "done" } });
    console.log(`[end-cyber] regular prices restored on ${n} product(s)`);
  } catch (e) {
    console.error("[end-cyber] skipped:", e.message);
  } finally {
    await prisma.$disconnect();
  }
})();
