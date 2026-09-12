"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

function slugify(s: string) {
  return s
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

export default function NewCollectionForm() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError("");
    try {
      const res = await fetch("/api/admin/collections", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, slug: slugify(name), active: true }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "No se pudo crear la colección.");
        return;
      }
      setName("");
      router.refresh();
    } finally {
      setSaving(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="flex items-end gap-3 rounded-xl border border-neutral-200 bg-white p-4">
      <div className="flex-1">
        <label className="mb-1 block text-sm font-medium">Nueva colección</label>
        <input
          required
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Ej. Navidad"
          className="w-full rounded-md border border-neutral-300 px-3 py-2"
        />
      </div>
      <button
        type="submit"
        disabled={saving}
        className="rounded-md bg-neutral-900 px-5 py-2 text-sm font-medium text-white disabled:opacity-50"
      >
        {saving ? "Creando..." : "Crear"}
      </button>
      {error && <p className="text-sm text-red-600">{error}</p>}
    </form>
  );
}
