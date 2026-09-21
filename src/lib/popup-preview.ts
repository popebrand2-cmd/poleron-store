import { useSyncExternalStore } from "react";

// Lets the owner open the offer popup on demand while editing (see SiteAssetsPanel).
let open = false;
const listeners = new Set<() => void>();

export function setPopupPreview(next: boolean) {
  if (open === next) return;
  open = next;
  listeners.forEach((l) => l());
}

export function usePopupPreview(): boolean {
  return useSyncExternalStore(
    (cb) => {
      listeners.add(cb);
      return () => listeners.delete(cb);
    },
    () => open,
    () => false,
  );
}
