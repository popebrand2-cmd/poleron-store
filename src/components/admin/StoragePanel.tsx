"use client";

import { useEffect, useState } from "react";

type Stats = {
  fileCount: number;
  totalBytes: number;
  deletableCount: number;
  deletableBytes: number;
  oldestMtimeMs: number | null;
  keepDays: number;
  disk: { totalBytes: number; freeBytes: number } | null;
};

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  return `${(bytes / (1024 * 1024 * 1024)).toFixed(2)} GB`;
}

export default function StoragePanel() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [cleaning, setCleaning] = useState(false);
  const [result, setResult] = useState<{ deleted: number; freedBytes: number; errors: string[] } | null>(null);

  async function load() {
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/admin/storage");
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "No se pudo leer el almacenamiento.");
      setStats(data);
    } catch (e) {
      setError(e instanceof Error ? e.message : "No se pudo leer el almacenamiento.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  async function cleanup() {
    if (!stats || stats.deletableCount === 0) return;
    if (!confirm(`¿Borrar ${stats.deletableCount} archivos sin usar (${formatBytes(stats.deletableBytes)})? No se puede deshacer.`)) return;
    setCleaning(true);
    setResult(null);
    setError("");
    try {
      const res = await fetch("/api/admin/storage", { method: "POST" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "No se pudo limpiar.");
      setResult(data);
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "No se pudo limpiar.");
    } finally {
      setCleaning(false);
    }
  }

  if (loading) return <p className="text-sm text-neutral-500">Revisando…</p>;
  if (error) return <p className="text-sm text-red-600">{error}</p>;
  if (!stats) return null;

  const oldestDate = stats.oldestMtimeMs ? new Date(stats.oldestMtimeMs).toLocaleDateString("es-CL") : "—";

  return (
    <div className="space-y-6">
      {stats.disk && (
        <div className={`rounded-xl border p-5 ${stats.disk.freeBytes < 100 * 1024 * 1024 ? "border-red-500" : "border-neutral-200"}`}>
          <p className="text-xs font-semibold uppercase tracking-wide text-neutral-500">Disco del servidor</p>
          <p className="text-2xl font-bold">
            {formatBytes(stats.disk.freeBytes)} libres <span className="text-base font-normal text-neutral-500">de {formatBytes(stats.disk.totalBytes)}</span>
          </p>
          {stats.disk.freeBytes < 100 * 1024 * 1024 && (
            <p className="mt-1 text-sm text-red-600">
              Queda muy poco espacio: nadie puede subir archivos. Borra lo que no se usa aquí abajo o amplía el volumen en Railway.
            </p>
          )}
        </div>
      )}

      <div className="grid grid-cols-2 gap-4 rounded-xl border border-neutral-200 p-5 sm:grid-cols-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-neutral-500">Archivos guardados</p>
          <p className="text-2xl font-bold">{stats.fileCount}</p>
        </div>
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-neutral-500">Espacio usado</p>
          <p className="text-2xl font-bold">{formatBytes(stats.totalBytes)}</p>
        </div>
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-neutral-500">El más antiguo</p>
          <p className="text-2xl font-bold">{oldestDate}</p>
        </div>
      </div>

      <div className="rounded-xl border border-neutral-200 p-5">
        <h2 className="font-semibold">Liberar espacio</h2>
        <p className="mt-1 text-sm text-neutral-600">
          Se pueden borrar con seguridad <strong>{stats.deletableCount}</strong> archivos ({formatBytes(stats.deletableBytes)}): tienen
          más de {stats.keepDays} días y no pertenecen a ningún producto, colección, pedido ni imagen de la página. Los archivos más
          nuevos no se tocan, por si un cliente los está usando ahora mismo.
        </p>
        <button
          type="button"
          onClick={cleanup}
          disabled={cleaning || stats.deletableCount === 0}
          className="mt-4 rounded-full bg-neutral-900 px-5 py-2.5 text-sm font-semibold text-white disabled:opacity-40"
        >
          {cleaning ? "Borrando…" : stats.deletableCount === 0 ? "No hay nada que borrar" : `Borrar ${stats.deletableCount} archivos sin usar`}
        </button>

        {result && (
          <div className="mt-4 rounded-lg bg-neutral-50 p-3 text-sm">
            <p>
              Se borraron <strong>{result.deleted}</strong> archivos y se liberaron <strong>{formatBytes(result.freedBytes)}</strong>.
            </p>
            {result.errors.length > 0 && (
              <p className="mt-1 text-red-600">{result.errors.length} archivos no se pudieron borrar.</p>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
