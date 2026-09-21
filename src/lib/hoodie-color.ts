import { useSyncExternalStore } from "react";

export type HoodieColor = "negro" | "blanco";

// Tiny shared store so the hero color picker and the "Así funciona" cards stay in sync.
let current: HoodieColor = "negro";
const listeners = new Set<() => void>();

export function setHoodieColor(next: HoodieColor) {
  if (next === current) return;
  current = next;
  listeners.forEach((l) => l());
}

export function useHoodieColor(): HoodieColor {
  return useSyncExternalStore(
    (cb) => {
      listeners.add(cb);
      return () => listeners.delete(cb);
    },
    () => current,
    () => "negro",
  );
}
