"use client";

import { useState } from "react";
import { usePathname } from "next/navigation";
import { useEditMode } from "./EditModeContext";
import { patchHero } from "@/lib/site-edit-client";

export default function EditModeToggle({ initialAccentColor }: { initialAccentColor: string }) {
  const { isAdmin, editMode, setEditMode } = useEditMode();
  const [accentColor, setAccentColor] = useState(initialAccentColor);
  const pathname = usePathname();

  if (!isAdmin || pathname?.startsWith("/admin")) return null;

  function saveAccent(color: string) {
    setAccentColor(color);
    document.documentElement.style.setProperty("--neon", color);
    patchHero({ accentColor: color });
  }

  return (
    <div className="fixed bottom-6 left-6 z-50 flex flex-col items-start gap-2">
      {editMode && (
        <div className="flex items-center gap-2 rounded-full bg-neutral-900 px-4 py-2 shadow-lg ring-1 ring-neutral-700">
          <label htmlFor="accent-color-input" className="text-xs font-medium text-neutral-300">
            Color de marca
          </label>
          <input
            id="accent-color-input"
            type="color"
            value={accentColor}
            onChange={(e) => saveAccent(e.target.value)}
            className="h-7 w-9 cursor-pointer rounded border-0 bg-transparent p-0"
          />
        </div>
      )}
      <button
        type="button"
        onClick={() => setEditMode(!editMode)}
        className={`rounded-full px-5 py-3 text-sm font-bold uppercase tracking-wide shadow-lg transition ${
          editMode ? "bg-neon text-black" : "bg-neutral-900 text-white ring-1 ring-neutral-700 hover:ring-neon"
        }`}
      >
        {editMode ? "Listo — salir de edición" : "✏️ Editar página"}
      </button>
    </div>
  );
}
