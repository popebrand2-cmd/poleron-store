import Link from "next/link";

const ADMIN_LINKS = [
  { href: "/admin", label: "Productos" },
  { href: "/admin/pedidos", label: "Pedidos" },
  { href: "/admin/envios", label: "Envíos" },
  { href: "/admin/portada", label: "Portada" },
  { href: "/admin/colecciones", label: "Colecciones" },
  { href: "/admin/estadisticas", label: "Estadísticas" },
];

export default function AdminNav({ current, pendingOrders }: { current: string; pendingOrders?: number }) {
  return (
    <nav className="flex flex-wrap items-center gap-4">
      {ADMIN_LINKS.filter((l) => l.href !== current).map((l) => (
        <Link key={l.href} href={l.href} className="text-sm font-medium text-neutral-700 hover:underline">
          {l.label}
          {l.href === "/admin/pedidos" && !!pendingOrders && ` (${pendingOrders})`}
        </Link>
      ))}
    </nav>
  );
}
