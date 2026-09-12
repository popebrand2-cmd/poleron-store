"use client";

export async function saveSiteText(key: string, value: string) {
  await fetch("/api/admin/site-text", {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ key, value }),
  });
}

export async function patchHero(fields: Record<string, string | number>) {
  await fetch("/api/admin/hero", {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(fields),
  });
}

export async function createContentItem(section: string) {
  const res = await fetch("/api/admin/content-items", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ section }),
  });
  const data = await res.json();
  return data.item as { id: string; icon: string; title: string; text: string };
}

export async function patchContentItem(id: string, fields: Record<string, string | boolean>) {
  await fetch(`/api/admin/content-items/${id}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(fields),
  });
}

export async function deleteContentItem(id: string) {
  await fetch(`/api/admin/content-items/${id}`, { method: "DELETE" });
}

export async function reorderContentItems(orderedIds: string[]) {
  await fetch("/api/admin/content-items/reorder", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ orderedIds }),
  });
}
