"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

// For an order still marked "Pendiente de pago": ask Mercado Pago again, or mark it paid by hand (a transfer, or a payment
// the owner can see in their own account).
export default function PendingPaymentActions({ orderId }: { orderId: string }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");

  async function verify() {
    setBusy(true);
    setMessage("");
    try {
      const res = await fetch(`/api/admin/orders/${orderId}/verify`, { method: "POST" });
      const data = (await res.json().catch(() => ({}))) as { status?: string; error?: string };
      if (!res.ok) throw new Error(data.error ?? "No se pudo verificar.");
      if (data.status === "PAID") router.refresh();
      else setMessage("Mercado Pago aún no registra un pago aprobado para este pedido.");
    } catch (e) {
      setMessage(e instanceof Error ? e.message : "No se pudo verificar.");
    } finally {
      setBusy(false);
    }
  }

  async function markPaid() {
    if (!confirm("¿Marcar este pedido como pagado?\n\nHazlo solo si ya viste el dinero en tu cuenta.")) return;
    setBusy(true);
    setMessage("");
    try {
      const res = await fetch(`/api/admin/orders/${orderId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "PAID" }),
      });
      if (!res.ok) throw new Error("No se pudo cambiar el estado.");
      router.refresh();
    } catch (e) {
      setMessage(e instanceof Error ? e.message : "No se pudo cambiar el estado.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <span className="flex flex-col items-end gap-1 text-sm">
      <span className="flex items-center gap-3">
        <button type="button" disabled={busy} onClick={verify} className="font-medium text-sky-700 hover:underline disabled:opacity-50">
          Verificar pago
        </button>
        <button type="button" disabled={busy} onClick={markPaid} className="font-medium text-emerald-700 hover:underline disabled:opacity-50">
          Marcar pagado
        </button>
      </span>
      {message && <span className="max-w-[16rem] text-right text-xs text-red-600">{message}</span>}
    </span>
  );
}
