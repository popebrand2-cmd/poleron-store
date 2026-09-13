import { prisma } from "@/lib/prisma";
import PortadaForm from "@/components/admin/PortadaForm";
import AdminNav from "@/components/admin/AdminNav";

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
  heroImagePosX: 50,
  heroImagePosY: 50,
  heroImageZoom: 1,
};

export default async function AdminPortadaPage() {
  const settings = await prisma.storeSettings.findUnique({ where: { id: "singleton" } });

  return (
    <main className="mx-auto max-w-5xl p-6">
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Portada</h1>
        <AdminNav current="/admin/portada" />
      </div>

      <PortadaForm
        initialHeroImageUrl={settings?.heroImageUrl ?? ""}
        initialHeroEyebrow={settings?.heroEyebrow || DEFAULTS.heroEyebrow}
        initialHeroHeadline={settings?.heroHeadline || DEFAULTS.heroHeadline}
        initialHeroSubtext={settings?.heroSubtext || DEFAULTS.heroSubtext}
        initialHeroCta={settings?.heroCta || DEFAULTS.heroCta}
        initialHeroImageAlign={(settings?.heroImageAlign as "left" | "right") || DEFAULTS.heroImageAlign}
        initialHeroImagePosX={settings?.heroImagePosX ?? DEFAULTS.heroImagePosX}
        initialHeroImagePosY={settings?.heroImagePosY ?? DEFAULTS.heroImagePosY}
        initialHeroImageZoom={settings?.heroImageZoom ?? DEFAULTS.heroImageZoom}
      />
    </main>
  );
}
