import Link from "next/link";
import { redirect } from "next/navigation";
import { SECTIONS } from "@/lib/admin-auth";
import { getAdminAccess } from "@/lib/admin-session";
import LogoutButton from "./LogoutButton";

export default async function AdminNav({ current, pendingOrders }: { current: string; pendingOrders?: number }) {
  const access = await getAdminAccess();
  // Session revoked (person deactivated) or cookie gone: back to login.
  if (!access) redirect("/admin/login");

  const links: { href: string; label: string }[] = SECTIONS.filter((s) => access.perms.includes(s.key)).map((s) => ({ href: s.href, label: s.label.split(" ")[0] }));
  if (access.kind === "owner") links.push({ href: "/admin/usuarios", label: "Usuarios" });

  return (
    <nav className="flex flex-wrap items-center gap-4">
      {links
        .filter((l) => l.href !== current)
        .map((l) => (
          <Link key={l.href} href={l.href} className="text-sm font-medium text-neutral-700 hover:underline">
            {l.label}
            {l.href === "/admin/pedidos" && !!pendingOrders && ` (${pendingOrders})`}
          </Link>
        ))}
      <LogoutButton name={access.name} />
    </nav>
  );
}
