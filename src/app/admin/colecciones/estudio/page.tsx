import Link from "next/link";
import { prisma } from "@/lib/prisma";
import AdminNav from "@/components/admin/AdminNav";
import DesignStudio from "@/components/admin/DesignStudio";
import { loadGarments } from "@/lib/garments-server";
import { DEFAULT_SECTIONS } from "@/lib/collection-sections";

export const dynamic = "force-dynamic";

export default async function DesignStudioPage() {
  const [garments, collections] = await Promise.all([
    loadGarments(),
    prisma.designCollection.findMany({ orderBy: { sortOrder: "asc" }, select: { id: true, name: true, slug: true, category: true, photoUrl: true } }),
  ]);
  const sections = Array.from(new Set([...DEFAULT_SECTIONS, ...collections.map((c) => c.category).filter(Boolean)]));

  return (
    <main className="mx-auto max-w-7xl p-6">
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Estudio de diseños</h1>
        <AdminNav current="/admin/colecciones/estudio" />
      </div>
      <p className="mb-8 max-w-3xl text-sm text-neutral-500">
        Sube el diseño del frente y/o de la espalda, quítale el fondo, mejora su calidad y míralo puesto en todas tus prendas. Cuando te guste,
        publícalo en una colección (o crea una nueva) y aparece al instante en la página del artista.{" "}
        <Link href="/admin/colecciones" className="underline">
          Volver a Colecciones
        </Link>
      </p>
      <DesignStudio garments={garments} collections={collections} sections={sections} />
    </main>
  );
}
