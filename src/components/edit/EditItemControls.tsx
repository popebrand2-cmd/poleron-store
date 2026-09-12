"use client";

import { ICON_KEYS } from "@/components/Icon";

export function DragHandle() {
  return (
    <span className="cursor-grab select-none px-1 text-neutral-600" title="Arrastra para reordenar">
      ⠿
    </span>
  );
}

export function DeleteItemButton({ onDelete }: { onDelete: () => void }) {
  return (
    <button
      type="button"
      onClick={onDelete}
      className="flex h-6 w-6 items-center justify-center rounded-full text-neutral-500 transition hover:bg-red-500/10 hover:text-red-500"
      title="Eliminar"
      aria-label="Eliminar"
    >
      ✕
    </button>
  );
}

export function AddItemButton({ onAdd, label }: { onAdd: () => void; label: string }) {
  return (
    <button
      type="button"
      onClick={onAdd}
      className="rounded-full border border-dashed border-neon/60 px-4 py-2 text-xs font-bold uppercase tracking-wide text-neon transition hover:bg-neon/10"
    >
      + {label}
    </button>
  );
}

export function IconPicker({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className="rounded border border-neutral-700 bg-black px-1 py-0.5 text-[10px] uppercase text-neutral-300"
      title="Ícono"
    >
      {ICON_KEYS.map((k) => (
        <option key={k} value={k}>
          {k}
        </option>
      ))}
    </select>
  );
}
