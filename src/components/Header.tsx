"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { useCartStore } from "@/lib/cart-store";
import AnnouncementBar from "./AnnouncementBar";

const NAV_LINKS = [
  { href: "/", label: "Inicio" },
  { href: "/#tienda", label: "Tienda" },
  { href: "/#colecciones", label: "Colecciones" },
];

export default function Header() {
  const pathname = usePathname();
  const isAdmin = pathname?.startsWith("/admin");

  const items = useCartStore((s) => s.items);
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  const [menuOpen, setMenuOpen] = useState(false);
  useEffect(() => setMenuOpen(false), [pathname]);

  const count = mounted ? items.reduce((sum, i) => sum + i.quantity, 0) : 0;

  return (
    <div className="sticky top-0 z-20">
      {!isAdmin && <AnnouncementBar />}
      <header className="border-b border-neutral-800 bg-black">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
          {!isAdmin && (
            <button
              type="button"
              onClick={() => setMenuOpen((v) => !v)}
              aria-label={menuOpen ? "Cerrar menú" : "Abrir menú"}
              aria-expanded={menuOpen}
              className="flex h-8 w-8 items-center justify-center text-white sm:hidden"
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="h-6 w-6">
                {menuOpen ? (
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 6l12 12M18 6L6 18" />
                ) : (
                  <path strokeLinecap="round" strokeLinejoin="round" d="M4 7h16M4 12h16M4 17h16" />
                )}
              </svg>
            </button>
          )}

          <Link href="/" className="text-3xl font-black uppercase tracking-tight text-white sm:text-4xl">
            MAD
          </Link>

          {!isAdmin && (
            <nav className="hidden items-center gap-8 text-sm font-semibold uppercase tracking-wide text-neutral-300 sm:flex">
              {NAV_LINKS.map((link) => (
                <Link key={link.href} href={link.href} className="transition hover:text-neon">
                  {link.label}
                </Link>
              ))}
            </nav>
          )}

          <div className="flex items-center gap-4">
            {isAdmin && (
              <Link href="/" className="text-xs font-medium text-neutral-400 hover:text-white">
                Ver tienda
              </Link>
            )}
            <Link href="/carrito" className="relative text-white" aria-label="Carrito">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth={1.75}
                className="h-6 w-6"
              >
                <path strokeLinecap="round" strokeLinejoin="round" d="M3 3h2l.4 2M7 13h10l3-8H5.4M7 13L5.4 5M7 13l-1.7 6.8A1 1 0 0 0 6.3 21H17" />
                <circle cx="9" cy="21" r="1.3" fill="currentColor" stroke="none" />
                <circle cx="17" cy="21" r="1.3" fill="currentColor" stroke="none" />
              </svg>
              {count > 0 && (
                <span className="absolute -right-2 -top-2 flex h-4 w-4 items-center justify-center rounded-full bg-neon text-[10px] font-bold text-black">
                  {count}
                </span>
              )}
            </Link>
          </div>
        </div>

        {!isAdmin && menuOpen && (
          <nav className="flex flex-col border-t border-neutral-800 py-2 text-sm font-semibold uppercase tracking-wide text-neutral-300 sm:hidden">
            {NAV_LINKS.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                onClick={() => setMenuOpen(false)}
                className="px-6 py-3 transition hover:bg-neutral-900 hover:text-neon"
              >
                {link.label}
              </Link>
            ))}
          </nav>
        )}
      </header>
    </div>
  );
}
