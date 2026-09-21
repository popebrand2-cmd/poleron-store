import { prisma } from "@/lib/prisma";
import { SECTIONS } from "@/lib/admin-auth";
import { permsFor } from "@/lib/admin-session";
import AdminNav from "@/components/admin/AdminNav";
import UsersManager from "@/components/admin/UsersManager";

export const dynamic = "force-dynamic";

export default async function AdminUsersPage() {
  const users = await prisma.adminUser.findMany({ orderBy: { createdAt: "asc" } });

  return (
    <main className="mx-auto max-w-5xl p-6">
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Usuarios y accesos</h1>
        <AdminNav current="/admin/usuarios" />
      </div>
      <p className="mb-6 max-w-2xl text-sm text-neutral-500">
        Cada persona entra con su correo y contraseña. La socia puede tener acceso total; a tus empleados les
        activas solo las secciones que quieres que vean. Solo tú (con la clave principal) ves esta página. Los
        cambios (activar/desactivar secciones o a la persona) se aplican casi al instante.
      </p>
      <UsersManager
        sections={SECTIONS.map((s) => ({ key: s.key, label: s.label }))}
        users={users.map((u) => ({
          id: u.id,
          name: u.name,
          email: u.email,
          role: u.role === "PARTNER" ? "PARTNER" : "EMPLOYEE",
          permissions: permsFor(u.role, u.permissions),
          active: u.active,
        }))}
      />
    </main>
  );
}
