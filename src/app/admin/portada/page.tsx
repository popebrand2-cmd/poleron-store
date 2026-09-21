import Link from "next/link";
import AdminNav from "@/components/admin/AdminNav";
import SiteAssetsPanel from "@/components/edit/SiteAssetsPanel";

export const dynamic = "force-dynamic";

const EDITABLE = [
  "Portada: titular, subtítulo, frase, botón y textos del polerón (Antes / Después / Negro / Blanco)",
  "Así funciona: título, los 3 pasos y sus etiquetas",
  "Barra de anuncios de arriba (los 3 mensajes) y el menú",
  "Frase de marca, preguntas frecuentes, insignias de confianza y todas las secciones de la página",
  "Pie de página: frases, enlaces y derechos",
  "Color de marca (botón «Color de marca» en modo edición)",
];

export default function AdminPortadaPage() {
  return (
    <main className="mx-auto max-w-3xl p-6">
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Portada y textos</h1>
        <AdminNav current="/admin/portada" />
      </div>

      <section className="space-y-4 rounded-2xl border border-neutral-800 p-5">
        <h2 className="text-lg font-semibold">Edita la página directamente</h2>
        <p className="text-sm text-neutral-300">
          Todo el texto se cambia sobre la propia tienda: abre la página, pulsa <strong>Editar página</strong> (abajo a la izquierda),
          toca cualquier texto con borde punteado, escribe y toca fuera para guardar. Los cambios se ven al instante.
        </p>
        <ul className="list-disc space-y-1 pl-5 text-sm text-neutral-300">
          {EDITABLE.map((e) => (
            <li key={e}>{e}</li>
          ))}
        </ul>
        <Link
          href="/?editar=1"
          className="inline-block rounded-full bg-neon px-5 py-2.5 text-sm font-bold uppercase tracking-wide text-black"
        >
          Abrir la tienda en modo edición
        </Link>
      </section>

      <section className="mt-6 space-y-3">
        <h2 className="text-lg font-semibold">Imágenes y contacto</h2>
        <p className="text-sm text-neutral-300">
          Cambia el logo, la firma, las fotos del polerón y el diseño de muestra, y el número de WhatsApp. Los productos, colecciones y
          envíos se editan en sus propias secciones del panel.
        </p>
        <SiteAssetsPanel defaultOpen />
      </section>
    </main>
  );
}
