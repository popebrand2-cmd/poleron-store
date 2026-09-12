"use client";

import { useRef } from "react";

// Minimal native HTML5 drag-and-drop reordering — no library needed for a
// handful of list items. Spread the returned props onto each draggable row.
export function useDragReorder(moveItem: (fromIndex: number, toIndex: number) => void) {
  const dragIndex = useRef<number | null>(null);

  return function dragProps(index: number) {
    return {
      draggable: true,
      onDragStart: () => {
        dragIndex.current = index;
      },
      onDragOver: (e: React.DragEvent) => e.preventDefault(),
      onDrop: (e: React.DragEvent) => {
        e.preventDefault();
        if (dragIndex.current !== null) moveItem(dragIndex.current, index);
        dragIndex.current = null;
      },
    };
  };
}
