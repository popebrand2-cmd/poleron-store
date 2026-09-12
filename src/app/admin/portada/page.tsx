import Link from "next/link";
import { prisma } from "@/lib/prisma";
import PortadaForm from "@/components/admin/PortadaForm";

export const dynamic = "force-dynamic";

// Mirrors the StoreSettings @default() values in schema.prisma, so the
// admin form starts pre-filled with what the site is actually showing
// even before any row exists in the database.
const DEFAULTS = {
  heroEyebrow: "MAD · Personalización 100% real",
  heroHeadline: "Diseña\ntu propia\nesencia.",
  heroSubtext:
    "Sube tu diseño, personalízalo sobre la prenda real y mira el resultado antes de comprar. Sin catálogos genéricos — cada pieza sale exactamente como la imaginaste.",
  heroCta: "Personaliza aquí",
  heroImageAlign: "right" as const,
};

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
          <Link href="/admin/colecciones" className="text-sm font-medium text-neutral-700 hover:underline">
            Colecciones
          </Link>
          <Link href="/admin" className="text-sm font-medium text-neutral-700 hover:underline">
            ← Productos
          </Link>
        </div>
      </div>

      <PortadaForm
        initialHeroImageUrl={settings?.heroImageUrl ?? ""}
        initialHeroEyebrow={settings?.heroEyebrow || DEFAULTS.heroEyebrow}
        initialHeroHeadline={settings?.heroHeadline || DEFAULTS.heroHeadline}
        initialHeroSubtext={settings?.heroSubtext || DEFAULTS.heroSubtext}
        initialHeroCta={settings?.heroCta || DEFAULTS.heroCta}
        initialHeroImageAlign={(settings?.heroImageAlign as "left" | "right") || DEFAULTS.heroImageAlign}
      />
    </main>
  );
}
