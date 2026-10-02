"use client";

import { useState } from "react";
import { createReview, patchReview, deleteReview, reorderReviews } from "@/lib/site-edit-client";

export type ReviewRow = {
  id: string;
  customerName: string;
  rating: number;
  text: string;
  photoUrl: string;
  productSlug: string;
  verified: boolean;
  reviewDate: string;
};

export function useReviews(initial: ReviewRow[]) {
  const [items, setItems] = useState(initial);

  async function addItem() {
    const item = await createReview();
    setItems((prev) => [...prev, item]);
  }

  function updateItem(id: string, fields: Partial<ReviewRow>) {
    setItems((prev) => prev.map((it) => (it.id === id ? { ...it, ...fields } : it)));
    patchReview(id, fields as Record<string, string | number | boolean>);
  }

  async function removeItem(id: string) {
    setItems((prev) => prev.filter((it) => it.id !== id));
    await deleteReview(id);
  }

  function moveItem(fromIndex: number, toIndex: number) {
    if (fromIndex === toIndex) return;
    setItems((prev) => {
      const next = [...prev];
      const [moved] = next.splice(fromIndex, 1);
      next.splice(toIndex, 0, moved);
      reorderReviews(next.map((it) => it.id));
      return next;
    });
  }

  return { items, addItem, updateItem, removeItem, moveItem };
}
