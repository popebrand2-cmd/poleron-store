"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useCartStore } from "@/lib/cart-store";
import { formatCLP } from "@/lib/money";

export default function CartPage() {
  const { items, removeItem, setQuantity } = useCartStore();
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  if (!mounted) return null;

  const subtotal = items.reduce((sum, i) => sum + i.unitPrice * i.quantity, 0);

  if (items.length === 0) {
    return (
      <main className="mx-auto max-w-3xl px-6 py-16 text-center">
        <h1 className="mb-3 text-2xl font-semibold">Tu carrito está vacío</h1>
        <Link href="/" className="text-fuchsia-600 hover:underline">
          Ver productos
        </Link>
      </main>
    );
  }

  return (
    <main className="mx-auto max-w-3xl px-6 py-10">
      <h1 className="mb-6 text-2xl font-semibold">Tu carrito</h1>
      <div className="divide-y divide-neutral-200 rounded-xl border border-neutral-200 bg-white">
        {items.map((item) => (
          <div key={item.id} className="flex gap-4 p-4">
            {item.previewImageUrl && (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={item.previewImageUrl}
                alt={item.productName}
                className="h-24 w-24 rounded-lg border border-neutral-200 object-cover"
              />
            )}
            <div className="flex-1">
              <p className="font-medium">{item.productName}</p>
              <p className="text-sm text-neutral-500">
                Color {item.colorName} · Talla {item.sizeLabel}
                {item.materialLabel && ` · ${item.materialLabel}`}
              </p>
              <p className="text-sm text-neutral-500">{Object.keys(item.designPlacement).join(", ")}</p>
              <div className="mt-2 flex items-center gap-3">
                <input
                  type="number"
                  min={1}
                  value={item.quantity}
                  onChange={(e) => setQuantity(item.id, Number(e.target.value))}
                  className="w-16 rounded-md border border-neutral-300 px-2 py-1 text-sm"
                />
                <button
                  onClick={() => removeItem(item.id)}
                  className="text-sm text-red-600 hover:underline"
                >
                  Quitar
                </button>
              </div>
            </div>
            <p className="font-medium">{formatCLP(item.unitPrice * item.quantity)}</p>
          </div>
        ))}
      </div>

      <div className="mt-6 flex items-center justify-between">
        <p className="text-lg font-semibold">Subtotal</p>
        <p className="text-lg font-semibold">{formatCLP(subtotal)}</p>
      </div>

      <Link
        href="/checkout"
        className="mt-6 block w-full rounded-md bg-neutral-900 px-6 py-3 text-center font-medium text-white"
      >
        Ir a pagar
      </Link>
    </main>
  );
}
