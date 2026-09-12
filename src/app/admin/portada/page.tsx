import Link from "next/link";
import { prisma } from "@/lib/prisma";
import PortadaForm from "@/components/admin/PortadaForm";

export const dynamic = "force-dynamic";

export default async function AdminPortadaPage() {
  const settings = await prisma.storeSettings.findUnique({ where: { id: "singleton" } });

  return (
    <main className="mx-auto max-w-5xl p-6">
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Portada</h1>
        <div className="flex items-center gap-4">
          <Link href="/admin/pedidos" className="text-sm font-medium text-neutral-700 hover:underline">
            Pedidos
          </Link>
          <Link href="/admin/envios" className="text-sm font-medium text-neutral-700 hover:underline">
            Envíos
          </Link>
          <Link href="/admin" className="text-sm font-medium text-neutral-700 hover:underline">
            ← Productos
          </Link>
        </div>
      </div>

      <PortadaForm initialHeroImageUrl={settings?.heroImageUrl ?? ""} />
    </main>
  );
}
