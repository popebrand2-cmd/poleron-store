"use client";

import { useEffect, useState } from "react";
import { useCartStore } from "@/lib/cart-store";
import { formatCLP } from "@/lib/money";

export default function CheckoutPage() {
  const items = useCartStore((s) => s.items);
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [address, setAddress] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  if (!mounted) return null;

  const subtotal = items.reduce((sum, i) => sum + i.unitPrice * i.quantity, 0);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);

    const res = await fetch("/api/checkout", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        customerName: name,
        customerEmail: email,
        customerPhone: phone,
        shippingAddr: address,
        items,
      }),
    });

    const data = await res.json();
    setLoading(false);

    if (!res.ok) {
      setError(data.error ?? "No se pudo procesar el pedido.");
      return;
    }

    window.location.href = data.redirectUrl;
  }

  if (items.length === 0) {
    return (
      <main className="mx-auto max-w-xl px-6 py-16 text-center text-neutral-500">
        Tu carrito está vacío.
      </main>
    );
  }

  return (
    <main className="mx-auto max-w-xl px-6 py-10">
      <h1 className="mb-6 text-2xl font-semibold">Datos de envío y pago</h1>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="mb-1 block text-sm font-medium">Nombre completo</label>
          <input
            required
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="w-full rounded-md border border-neutral-300 px-3 py-2"
          />
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium">Email</label>
          <input
            required
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full rounded-md border border-neutral-300 px-3 py-2"
          />
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium">Teléfono</label>
          <input
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            className="w-full rounded-md border border-neutral-300 px-3 py-2"
          />
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium">Dirección de envío</label>
          <textarea
            required
            value={address}
            onChange={(e) => setAddress(e.target.value)}
            rows={3}
            className="w-full rounded-md border border-neutral-300 px-3 py-2"
          />
        </div>

        <div className="flex items-center justify-between border-t border-neutral-200 pt-4">
          <p className="font-semibold">Total</p>
          <p className="font-semibold">{formatCLP(subtotal)}</p>
        </div>

        {error && <p className="text-sm text-red-600">{error}</p>}

        <button
          type="submit"
          disabled={loading}
          className="w-full rounded-md bg-neutral-900 px-6 py-3 font-medium text-white disabled:opacity-50"
        >
          {loading ? "Redirigiendo a pago..." : "Pagar con Mercado Pago"}
        </button>
      </form>
    </main>
  );
}
