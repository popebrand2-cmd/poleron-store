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

// Videos are big, so this uses XHR to report upload progress.
export function uploadSiteVideo(file: File, onProgress?: (pct: number) => void): Promise<string> {
  return new Promise((resolve, reject) => {
    const body = new FormData();
    body.append("file", file);
    const xhr = new XMLHttpRequest();
    xhr.open("POST", "/api/admin/upload-video");
    xhr.upload.onprogress = (e) => {
      if (e.lengthComputable) onProgress?.(Math.round((e.loaded / e.total) * 100));
    };
    xhr.onerror = () => reject(new Error("No se pudo subir el video. Revisa tu conexión."));
    xhr.onload = () => {
      try {
        const data = JSON.parse(xhr.responseText);
        if (xhr.status >= 200 && xhr.status < 300 && data.url) resolve(data.url as string);
        else reject(new Error(data.error ?? "No se pudo subir el video."));
      } catch {
        reject(new Error(xhr.status === 413 ? "El video es demasiado grande." : "No se pudo subir el video."));
      }
    };
    xhr.send(body);
  });
}

export async function uploadSiteImage(file: File): Promise<string> {
  const body = new FormData();
  body.append("file", file);
  const res = await fetch("/api/upload", { method: "POST", body });
  const data = await res.json();
  if (!res.ok || !data.url) throw new Error(data.error ?? "No se pudo subir la imagen.");
  return data.url as string;
}
