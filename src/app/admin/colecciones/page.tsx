import Link from "next/link";
import { prisma } from "@/lib/prisma";
import NewCollectionForm from "@/components/admin/NewCollectionForm";
import DeleteCollectionButton from "@/components/admin/DeleteCollectionButton";
import AdminNav from "@/components/admin/AdminNav";
import { DEFAULT_SECTIONS } from "@/lib/collection-sections";

export const dynamic = "force-dynamic";

export default async function AdminCollectionsPage() {
  const collections = await prisma.designCollection.findMany({
    orderBy: { sortOrder: "asc" },
    include: { designs: true },
  });

  return (
    <main className="mx-auto max-w-5xl p-6">
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Colecciones de diseños</h1>
        <AdminNav current="/admin/colecciones" />
      </div>

      <p className="mb-6 max-w-2xl text-sm text-neutral-500">
        Cada colección es un artista o tema (ej. &quot;Karol G&quot;, &quot;Navidad&quot;) y se agrupa en una <strong>sección</strong> (ej. &quot;Reguetón&quot;, &quot;Anime&quot;) que aparece como pestaña en la página principal. Sus diseños predeterminados son los que el cliente puede elegir
        en el personalizador en vez de subir su propio diseño. Los diseños marcados &quot;Adelante&quot; dejan
        elegir posición (izquierda, centro o derecha del pecho); los marcados &quot;Atrás&quot; usan siempre un
        tamaño fijo debajo de la capucha.
      </p>

      <NewCollectionForm categories={[...new Set([...DEFAULT_SECTIONS, ...collections.map((c) => c.category).filter(Boolean)])]} />

      {collections.length === 0 ? (
        <p className="mt-6 text-neutral-500">Todavía no tienes colecciones.</p>
      ) : (
        <div className="mt-6 divide-y divide-neutral-200 rounded-xl border border-neutral-200 bg-white">
          {collections.map((c) => (
            <div key={c.id} className="flex items-center justify-between gap-4 p-4">
              <div>
                <p className="font-medium">
                  {c.name}{" "}
                  {!c.active && (
                    <span className="ml-2 rounded bg-neutral-200 px-2 py-0.5 text-xs text-neutral-600">Oculta</span>
                  )}
                </p>
                <p className="text-sm text-neutral-500">
                  {c.category || "Sin sección"} · {c.designs.length} diseño(s)
                </p>
              </div>
              <div className="flex items-center gap-3">
                <Link href={`/admin/colecciones/${c.id}`} className="text-sm text-fuchsia-600 hover:underline">
                  Editar
                </Link>
                <DeleteCollectionButton collectionId={c.id} collectionName={c.name} />
              </div>
            </div>
          ))}
        </div>
      )}
    </main>
  );
}
