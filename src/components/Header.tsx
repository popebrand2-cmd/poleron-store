"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { useCartStore } from "@/lib/cart-store";
import AnnouncementBar from "./AnnouncementBar";

export default function Header() {
  const pathname = usePathname();
  const isAdmin = pathname?.startsWith("/admin");

  const items = useCartStore((s) => s.items);
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  const count = mounted ? items.reduce((sum, i) => sum + i.quantity, 0) : 0;

  return (
    <div className="sticky top-0 z-20">
      {!isAdmin && <AnnouncementBar />}
      <header className="border-b border-neutral-800 bg-black">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
          <Link href="/" className="text-lg font-extrabold uppercase tracking-widest text-white">
            Poleron Store
          </Link>

          {!isAdmin && (
            <nav className="hidden items-center gap-8 text-xs font-semibold uppercase tracking-wide text-neutral-300 sm:flex">
              <Link href="/" className="transition hover:text-neon">
                Inicio
              </Link>
              <Link href="/#tienda" className="transition hover:text-neon">
                Tienda
              </Link>
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
      </header>
    </div>
  );
}
