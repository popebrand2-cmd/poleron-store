"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export default function OrderStatusControl({ orderId, status }: { orderId: string; status: string }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function change(next: string, confirmText?: string) {
    if (confirmText && !confirm(confirmText)) return;
    setBusy(true);
    setError("");
    try {
      const res = await fetch(`/api/admin/orders/${orderId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: next }),
      });
      if (!res.ok) throw new Error("No se pudo cambiar el estado.");
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "No se pudo cambiar el estado.");
    } finally {
      setBusy(false);
    }
  }

  if (status !== "PAID" && status !== "IN_PRODUCTION") return null;

  return (
    <span className="flex flex-wrap items-center gap-2 text-sm">
      {status === "PAID" && (
        <button type="button" disabled={busy} onClick={() => change("IN_PRODUCTION")} className="font-medium text-sky-700 hover:underline disabled:opacity-50">
          Pasar a producción
        </button>
      )}
      <button
        type="button"
        disabled={busy}
        onClick={() =>
          change(
            "SHIPPED",
            "¿Marcar este pedido como terminado (enviado o entregado)?\n\nSe borrarán la imagen original y el mockup del cliente para liberar espacio. Descárgalos antes si los necesitas.",
          )
        }
        className="font-medium text-emerald-700 hover:underline disabled:opacity-50"
      >
        Marcar terminado
      </button>
      {error && <span className="text-red-600">{error}</span>}
    </span>
  );
}
