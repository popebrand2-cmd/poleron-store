"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import EditableText from "./edit/EditableText";

export default function Footer({ tagline }: { tagline: string }) {
  const pathname = usePathname();
  if (pathname?.startsWith("/admin")) return null;

  return (
    <footer className="border-t border-neutral-800 bg-black">
      <div className="mx-auto max-w-6xl px-6 py-10">
        <div className="flex flex-col items-start justify-between gap-6 sm:flex-row sm:items-center">
          <div>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/brand/pope-logo.png" alt="POPE Brand" className="h-16 w-auto" />
            <p className="mt-3 text-[11px] font-bold uppercase tracking-[0.3em] text-neon">Personaliza / Crea / Viste</p>
            <p className="mt-1 max-w-sm text-xs text-neutral-500">
              <EditableText value={tagline} siteKey="footer.tagline" as="span" multiline />
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
          © {new Date().getFullYear()} POPE. Todos los derechos reservados.
        </p>
      </div>
    </footer>
  );
}
