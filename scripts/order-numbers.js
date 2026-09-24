// Gives every order without a number its POPE number (POPE01, POPE02 …) in the order it was placed.
// Safe to run on every start: it only touches orders that still have number 0.
const { PrismaClient } = require("@prisma/client");

(async () => {
  const prisma = new PrismaClient();
  try {
    const pending = await prisma.order.findMany({ where: { number: 0 }, orderBy: { createdAt: "asc" }, select: { id: true } });
    if (pending.length === 0) return;
    const max = await prisma.order.aggregate({ _max: { number: true } });
    let next = (max._max.number ?? 0) + 1;
    for (const o of pending) await prisma.order.update({ where: { id: o.id }, data: { number: next++ } });
    console.log(`[order-numbers] numbered ${pending.length} orders`);
  } catch (e) {
    console.error("[order-numbers] skipped:", e.message);
  } finally {
    await prisma.$disconnect();
  }
})();
