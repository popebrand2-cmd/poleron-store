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

      <p className="mb-6 text-sm text-neutral-600">
        Aquí se guardan todas las fotos que suben tus clientes (diseños, recortes, fondos quitados) y las imágenes o videos que subes
        tú desde el panel. Si el disco se llena, nadie puede subir nada nuevo — ni tus clientes ni tú.
      </p>

      <StoragePanel />
    </main>
  );
}
