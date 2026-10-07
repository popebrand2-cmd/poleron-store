"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useCartStore } from "@/lib/cart-store";
import { formatCLP } from "@/lib/money";
import { VatNote } from "@/components/ProductInfo";
import { FREE_SHIPPING_MIN } from "@/lib/shipping-rules";

export default function CartPage() {
  const { items, removeItem, setQuantity } = useCartStore();
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  if (!mounted) return null;

  const subtotal = items.reduce((sum, i) => sum + i.unitPrice * i.quantity, 0);
  const remaining = Math.max(0, FREE_SHIPPING_MIN - subtotal);

  if (items.length === 0) {
    return (
      <main className="bg-black px-6 py-16">
        <div className="relative mx-auto max-w-3xl overflow-hidden rounded-2xl bg-white p-10 text-center text-neutral-900">
          <div className="absolute inset-x-0 top-0 h-1.5 bg-neon" />
          <h1 className="mb-3 text-2xl font-semibold">Tu carrito está vacío</h1>
          <Link href="/" className="text-green-700 hover:underline">
            Ver productos
          </Link>
        </div>
      </main>
    );
  }

  return (
    <main className="bg-black px-6 py-10">
    <div className="relative mx-auto max-w-3xl overflow-hidden rounded-2xl bg-white p-6 text-neutral-900 sm:p-8">
      <div className="absolute inset-x-0 top-0 h-1.5 bg-neon" />
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
              <p className="text-sm text-neutral-500">{Object.keys(item.designPlacement).length > 0 ? Object.keys(item.designPlacement).join(", ") : "Pieza exclusiva · edición limitada"}</p>
              <div className="mt-2 flex items-center gap-3">
                <input
                  type="number"
                  min={1}
                  value={item.quantity}
                  onChange={(e) => setQuantity(item.id, Number(e.target.value))}
                  className="w-16 rounded-md border border-neutral-300 px-2 py-1 text-sm"
                />
                {Object.keys(item.designPlacement).length > 0 && (
                  <Link
                    href={`/productos/${item.productSlug}?editar=${item.id}`}
                    className="text-sm font-medium text-neutral-700 underline underline-offset-2 hover:text-black"
                  >
                    Editar diseño
                  </Link>
                )}
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
      <div className="mt-4 rounded-xl border border-neutral-200 bg-neutral-50 p-3">
        <p className="text-sm font-semibold">
          {remaining > 0 ? (
            <>
              Te faltan <span className="text-green-700">{formatCLP(remaining)}</span> para el envío gratis en la Región Metropolitana
            </>
          ) : (
            <span className="text-green-700">🎉 ¡Tienes envío gratis en la Región Metropolitana!</span>
          )}
        </p>
        <div className="mt-2 h-2 overflow-hidden rounded-full bg-neutral-200" role="progressbar" aria-valuemin={0} aria-valuemax={FREE_SHIPPING_MIN} aria-valuenow={Math.min(subtotal, FREE_SHIPPING_MIN)}>
          <div className="h-full rounded-full bg-neon transition-all duration-500 motion-reduce:transition-none" style={{ width: `${Math.min(100, (subtotal / FREE_SHIPPING_MIN) * 100)}%` }} />
        </div>
        <p className="mt-1.5 text-xs text-neutral-500">Retiro en tienda siempre gratis. Para otras comunas, el costo se calcula en el siguiente paso.</p>
      </div>
      <VatNote className="mt-1" />

      <Link
        href="/checkout"
        className="group mt-6 flex w-full items-center justify-center gap-3 rounded-full bg-neon py-3 pl-6 pr-2 text-sm font-bold uppercase tracking-wide text-black transition hover:brightness-90"
      >
        Ir a pagar
        <span className="flex h-8 w-8 items-center justify-center rounded-full bg-black text-neon transition group-hover:translate-x-0.5">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="h-4 w-4">
            <path strokeLinecap="round" strokeLinejoin="round" d="M5 12h14M13 6l6 6-6 6" />
          </svg>
        </span>
      </Link>
    </div>
    </main>
  );
}
