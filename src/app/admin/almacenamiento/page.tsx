import AdminNav from "@/components/admin/AdminNav";
import StoragePanel from "@/components/admin/StoragePanel";

export const dynamic = "force-dynamic";

export default function AdminStoragePage() {
  return (
    <main className="mx-auto max-w-3xl p-6">
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Almacenamiento</h1>
        <AdminNav current="/admin/almacenamiento" />
      </div>

      <section className="mb-8 rounded-xl border border-neutral-200 bg-neutral-50 p-5">
        <h2 className="font-semibold">Respaldo de tu tienda</h2>
        <p className="mt-1 text-sm text-neutral-600">
          Descarga una copia de tus productos, pedidos, textos y colecciones en un archivo. No incluye contraseñas. Guárdalo en tu
          computador de vez en cuando, sobre todo si tienes dudas sobre el acceso a tu correo o a Railway — esto funciona solo con tu
          clave de la tienda, sin depender de esas otras cuentas.
        </p>
        <a
          href="/api/admin/backup"
          download
          className="mt-4 inline-block rounded-full bg-neutral-900 px-5 py-2.5 text-sm font-semibold text-white hover:bg-neutral-800"
        >
          Descargar respaldo (JSON)
        </a>
      </section>

      <h2 className="mb-2 font-semibold">Espacio de fotos y videos</h2>
      <p className="mb-6 text-sm text-neutral-600">
        Aquí se guardan todas las fotos que suben tus clientes (diseños, recortes, fondos quitados) y las imágenes o videos que subes
        tú desde el panel. Si el disco se llena, nadie puede subir nada nuevo — ni tus clientes ni tú.
      </p>

      <StoragePanel />
    </main>
  );
}
