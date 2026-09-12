"use client";

import { useState } from "react";
import { usePathname } from "next/navigation";
import { useEditMode } from "./EditModeContext";
import { patchHero } from "@/lib/site-edit-client";
import HeroImageControls from "./HeroImageControls";

export default function EditModeToggle({
  initialAccentColor,
  initialHeroAlign,
  initialHeroPosX,
  initialHeroPosY,
  initialHeroZoom,
}: {
  initialAccentColor: string;
  initialHeroAlign: "left" | "right";
  initialHeroPosX: number;
  initialHeroPosY: number;
  initialHeroZoom: number;
}) {
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
    <div className="fixed bottom-6 left-6 z-50 flex max-h-[85vh] flex-col items-start gap-2 overflow-y-auto">
      {editMode && pathname === "/" && (
        <HeroImageControls
          initialAlign={initialHeroAlign}
          initialPosX={initialHeroPosX}
          initialPosY={initialHeroPosY}
          initialZoom={initialHeroZoom}
        />
      )}
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
