import { statfs } from "fs/promises";
import Link from "next/link";
import { redirect } from "next/navigation";
import { SECTIONS } from "@/lib/admin-auth";
import { getAdminAccess } from "@/lib/admin-session";
import { uploadsDir } from "@/lib/storage";
import LogoutButton from "./LogoutButton";

export default async function AdminNav({ current, pendingOrders }: { current: string; pendingOrders?: number }) {
  const access = await getAdminAccess();
  // Session revoked (person deactivated) or cookie gone: back to login.
  if (!access) redirect("/admin/login");

  // Railway's own usage alerts need the Pro plan, so the owner gets the warning here instead.
  let diskUsedPct = 0;
  if (access.kind === "owner") {
    try {
      const d = await statfs(uploadsDir());
      diskUsedPct = Math.round((1 - d.bavail / d.blocks) * 100);
    } catch {
      // no disk info: no warning
    }
  }

  const links: { href: string; label: string }[] = SECTIONS.filter((s) => access.perms.includes(s.key)).map((s) => ({ href: s.href, label: s.label.split(" ")[0] }));
  if (access.kind === "owner") {
    links.push({ href: "/admin/usuarios", label: "Usuarios" });
    links.push({ href: "/admin/almacenamiento", label: "Almacenamiento" });
  }

  return (
    <nav className="flex flex-wrap items-center gap-4">
      {links
        .filter((l) => l.href !== current)
        .map((l) => (
          <Link key={l.href} href={l.href} className="text-sm font-medium text-neutral-700 hover:underline">
            {l.label}
            {l.href === "/admin/pedidos" && !!pendingOrders && ` (${pendingOrders})`}
            {l.href === "/admin/almacenamiento" && diskUsedPct >= 70 && (
              <span className="ml-1 rounded-full bg-red-600 px-2 py-0.5 text-xs font-bold text-white">Disco {diskUsedPct}% lleno</span>
            )}
          </Link>
        ))}
      <LogoutButton name={access.name} />
    </nav>
  );
}
