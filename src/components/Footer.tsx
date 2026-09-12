"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

export default function Footer() {
  const pathname = usePathname();
  if (pathname?.startsWith("/admin")) return null;

  return (
    <footer className="border-t border-neutral-800 bg-black">
      <div className="mx-auto max-w-6xl px-6 py-10">
        <div className="flex flex-col items-start justify-between gap-6 sm:flex-row sm:items-center">
          <div>
            <p className="text-sm font-extrabold uppercase tracking-widest text-white">MAD</p>
            <p className="mt-1 max-w-sm text-xs text-neutral-500">
              Ropa personalizada — subes tu diseño, ves el mockup real y lo recibimos hecho realidad.
            </p>
          </div>
          <div className="flex gap-6 text-xs font-medium uppercase tracking-wide text-neutral-400">
            <Link href="/" className="hover:text-white">
              Inicio
            </Link>
            <Link href="/#tienda" className="hover:text-white">
              Tienda
            </Link>
            <Link href="/carrito" className="hover:text-white">
              Carrito
            </Link>
          </div>
        </div>
        <p className="mt-8 text-xs text-neutral-600">
          © {new Date().getFullYear()} MAD. Todos los derechos reservados.
        </p>
      </div>
    </footer>
  );
}
