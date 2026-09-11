"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export default function DeleteOrderButton({ orderId }: { orderId: string }) {
  const router = useRouter();
  const [confirming, setConfirming] = useState(false);
  const [deleting, setDeleting] = useState(false);

  if (confirming) {
    return (
      <span className="flex items-center gap-2 text-sm">
        ¿Eliminar este pedido?
        <button
          disabled={deleting}
          onClick={async () => {
            setDeleting(true);
            await fetch(`/api/admin/orders/${orderId}`, { method: "DELETE" });
            router.refresh();
          }}
          className="font-medium text-red-600 hover:underline"
        >
          Sí
        </button>
        <button onClick={() => setConfirming(false)} className="text-neutral-500 hover:underline">
          No
        </button>
      </span>
    );
  }

  return (
    <button onClick={() => setConfirming(true)} className="text-sm text-red-600 hover:underline">
      Eliminar
    </button>
  );
}
