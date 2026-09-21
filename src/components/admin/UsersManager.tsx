"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

type SectionDef = { key: string; label: string };
type UserRow = {
  id: string;
  name: string;
  email: string;
  role: "PARTNER" | "EMPLOYEE";
  permissions: string[];
  active: boolean;
};

async function call(url: string, method: string, body?: unknown) {
  const res = await fetch(url, {
    method,
    headers: { "Content-Type": "application/json" },
    body: body ? JSON.stringify(body) : undefined,
  });
  const data = await res.json().catch(() => ({}));
  return { ok: res.ok, error: (data.error as string | undefined) ?? "" };
}

function UserCard({ user, sections }: { user: UserRow; sections: SectionDef[] }) {
  const router = useRouter();
  const [perms, setPerms] = useState(user.permissions);
  const [error, setError] = useState("");

  async function patch(body: Record<string, unknown>) {
    setError("");
    const r = await call(`/api/admin/users/${user.id}`, "PATCH", body);
    if (!r.ok) setError(r.error || "No se pudo guardar.");
    router.refresh();
  }

  function togglePerm(key: string) {
    const next = perms.includes(key) ? perms.filter((k) => k !== key) : [...perms, key];
    setPerms(next);
    patch({ permissions: next });
  }

  async function resetPassword() {
    const pw = window.prompt(`Nueva contraseña para ${user.name} (mínimo 6 caracteres):`);
    if (pw) await patch({ password: pw });
  }

  async function remove() {
    if (!window.confirm(`¿Eliminar a ${user.name}? Esta acción no se puede deshacer.`)) return;
    await call(`/api/admin/users/${user.id}`, "DELETE");
    router.refresh();
  }

  return (
    <div className="rounded-xl border border-neutral-200 bg-white p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="font-semibold">
            {user.name}{" "}
            <span className="ml-1 rounded bg-neutral-200 px-2 py-0.5 text-xs text-neutral-600">
              {user.role === "PARTNER" ? "Socia · acceso total" : "Empleado"}
            </span>
            {!user.active && <span className="ml-2 rounded bg-neutral-200 px-2 py-0.5 text-xs text-neutral-600">Desactivado</span>}
          </p>
          <p className="text-sm text-neutral-500">{user.email}</p>
        </div>
        <div className="flex items-center gap-3 text-sm">
          <button type="button" onClick={() => patch({ active: !user.active })} className="text-fuchsia-600 hover:underline">
            {user.active ? "Desactivar acceso" : "Activar acceso"}
          </button>
          <button type="button" onClick={resetPassword} className="text-neutral-600 hover:underline">
            Cambiar contraseña
          </button>
          <button type="button" onClick={remove} className="text-red-600 hover:underline">
            Eliminar
          </button>
        </div>
      </div>

      <div className="mt-4">
        <label className="mb-2 flex items-center gap-2 text-sm font-medium">
          <input
            type="checkbox"
            checked={user.role === "PARTNER"}
            onChange={(e) => patch({ role: e.target.checked ? "PARTNER" : "EMPLOYEE" })}
          />
          Acceso total (todas las secciones)
        </label>
        {user.role === "EMPLOYEE" && (
          <div className="grid gap-2 sm:grid-cols-2">
            {sections.map((s) => (
              <label key={s.key} className="flex items-center gap-2 text-sm">
                <input type="checkbox" checked={perms.includes(s.key)} onChange={() => togglePerm(s.key)} />
                {s.label}
              </label>
            ))}
          </div>
        )}
      </div>
      {error && <p className="mt-2 text-sm text-red-600">{error}</p>}
    </div>
  );
}

function NewUserForm({ sections }: { sections: SectionDef[] }) {
  const router = useRouter();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState<"PARTNER" | "EMPLOYEE">("EMPLOYEE");
  const [perms, setPerms] = useState<string[]>(["pedidos"]);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError("");
    const r = await call("/api/admin/users", "POST", { name, email, password, role, permissions: perms });
    setSaving(false);
    if (!r.ok) {
      setError(r.error || "No se pudo crear.");
      return;
    }
    setName("");
    setEmail("");
    setPassword("");
    setRole("EMPLOYEE");
    setPerms(["pedidos"]);
    router.refresh();
  }

  return (
    <form onSubmit={submit} className="rounded-xl border border-neutral-200 bg-white p-5">
      <h2 className="mb-4 text-sm">Agregar persona</h2>
      <div className="grid gap-3 sm:grid-cols-3">
        <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Nombre" className="rounded-md border border-neutral-300 px-3 py-2" />
        <input value={email} onChange={(e) => setEmail(e.target.value)} placeholder="Correo" type="email" className="rounded-md border border-neutral-300 px-3 py-2" />
        <input value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Contraseña (mín. 6)" type="text" className="rounded-md border border-neutral-300 px-3 py-2" />
      </div>
      <label className="mt-4 flex items-center gap-2 text-sm font-medium">
        <input type="checkbox" checked={role === "PARTNER"} onChange={(e) => setRole(e.target.checked ? "PARTNER" : "EMPLOYEE")} />
        Es socia — acceso total
      </label>
      {role === "EMPLOYEE" && (
        <div className="mt-3 grid gap-2 sm:grid-cols-2">
          {sections.map((s) => (
            <label key={s.key} className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={perms.includes(s.key)}
                onChange={() => setPerms(perms.includes(s.key) ? perms.filter((k) => k !== s.key) : [...perms, s.key])}
              />
              {s.label}
            </label>
          ))}
        </div>
      )}
      {error && <p className="mt-3 text-sm text-red-600">{error}</p>}
      <button type="submit" disabled={saving} className="mt-4 rounded-md bg-neutral-900 px-5 py-2 text-sm font-medium text-white disabled:opacity-50">
        {saving ? "Creando..." : "Crear acceso"}
      </button>
    </form>
  );
}

export default function UsersManager({ users, sections }: { users: UserRow[]; sections: SectionDef[] }) {
  return (
    <div className="space-y-4">
      <NewUserForm sections={sections} />
      {users.length === 0 ? (
        <p className="text-neutral-500">Todavía no has agregado a nadie.</p>
      ) : (
        users.map((u) => <UserCard key={u.id} user={u} sections={sections} />)
      )}
    </div>
  );
}
