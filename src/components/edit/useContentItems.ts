"use client";

import { useState } from "react";
import { createContentItem, patchContentItem, deleteContentItem, reorderContentItems } from "@/lib/site-edit-client";

export type ContentItemRow = { id: string; icon: string; title: string; text: string };

export function useContentItems(section: string, initial: ContentItemRow[]) {
  const [items, setItems] = useState(initial);

  async function addItem() {
    const item = await createContentItem(section);
    setItems((prev) => [...prev, item]);
  }

  function updateItem(id: string, fields: Partial<ContentItemRow>) {
    setItems((prev) => prev.map((it) => (it.id === id ? { ...it, ...fields } : it)));
    patchContentItem(id, fields);
  }

  async function removeItem(id: string) {
    setItems((prev) => prev.filter((it) => it.id !== id));
    await deleteContentItem(id);
  }

  function moveItem(fromIndex: number, toIndex: number) {
    if (fromIndex === toIndex) return;
    setItems((prev) => {
      const next = [...prev];
      const [moved] = next.splice(fromIndex, 1);
      next.splice(toIndex, 0, moved);
      reorderContentItems(next.map((it) => it.id));
      return next;
    });
  }

  return { items, addItem, updateItem, removeItem, moveItem };
}
