import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// A full export of everything that makes the store what it is — products, orders, site copy,
// collections, shipping rates, settings — as one downloadable JSON file. Independent of GitHub,
// Railway or Gmail: it only needs the store's own admin login, so it works even if the owner loses
// access to those other accounts. AdminUser rows are included without passwordHash (their login
// credentials aren't something a backup file should ever carry, even for the owner's own download).
export async function GET() {
  const [
    products,
    orders,
    shippingRates,
    storeSettings,
    siteText,
    contentItems,
    designCollections,
    adminUsers,
  ] = await Promise.all([
    prisma.product.findMany({
      include: { colors: { include: { views: true } }, sizes: true, materials: true },
    }),
    prisma.order.findMany({ include: { items: true }, orderBy: { createdAt: "asc" } }),
    prisma.shippingComunaRate.findMany(),
    prisma.storeSettings.findUnique({ where: { id: "singleton" } }),
    prisma.siteText.findMany(),
    prisma.contentItem.findMany(),
    prisma.designCollection.findMany({ include: { designs: true } }),
    prisma.adminUser.findMany({
      select: { id: true, name: true, email: true, role: true, permissions: true, active: true, createdAt: true },
    }),
  ]);

  const backup = {
    exportedAt: new Date().toISOString(),
    note: "Respaldo de POPE: productos, pedidos, textos y colecciones de la tienda. No incluye contraseñas.",
    products,
    orders,
    shippingRates,
    storeSettings,
    siteText,
    contentItems,
    designCollections,
    adminUsers,
  };

  const date = new Date().toISOString().slice(0, 10);
  return new NextResponse(JSON.stringify(backup, null, 2), {
    headers: {
      "Content-Type": "application/json",
      "Content-Disposition": `attachment; filename="pope-respaldo-${date}.json"`,
    },
  });
}
