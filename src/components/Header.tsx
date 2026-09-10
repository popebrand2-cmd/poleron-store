"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useCartStore } from "@/lib/cart-store";

export default function Header() {
  const items = useCartStore((s) => s.items);
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  const count = mounted ? items.reduce((sum, i) => sum + i.quantity, 0) : 0;

  return (
    <header className="sticky top-0 z-10 border-b border-neutral-200 bg-paper/95 backdrop-blur">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
        <Link href="/" className="text-lg font-semibold tracking-tight">
          Poleron Store
        </Link>
        <Link href="/carrito" className="text-sm font-medium">
          Carrito {count > 0 && <span className="ml-1 rounded-full bg-neutral-900 px-2 py-0.5 text-xs text-white">{count}</span>}
        </Link>
      </div>
    </header>
  );
}
