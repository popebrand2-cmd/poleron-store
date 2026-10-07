"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

// "Primero / ↑ / ↓": the order of the list is the order of the collections on the homepage.
export default function MoveCollectionButtons({ id, index, count }: { id: string; index: number; count: number }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);

  async function move(action: "first" | "up" | "down") {
    setBusy(true);
    await fetch("/api/admin/collections/reorder", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, action }),
    });
    router.refresh();
    setBusy(false);
  }

  const btn = "rounded-md border border-neutral-300 px-2 py-1 text-xs font-medium text-neutral-700 hover:bg-neutral-100 disabled:cursor-not-allowed disabled:opacity-30";
  return (
    <div className="flex items-center gap-1">
      <button type="button" disabled={busy || index === 0} onClick={() => move("first")} className={btn} title="Poner primera en la portada">
        Primera
      </button>
      <button type="button" disabled={busy || index === 0} onClick={() => move("up")} className={btn} aria-label="Subir" title="Subir">
        ↑
      </button>
      <button type="button" disabled={busy || index === count - 1} onClick={() => move("down")} className={btn} aria-label="Bajar" title="Bajar">
        ↓
      </button>
    </div>
  );
}
