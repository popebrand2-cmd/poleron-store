"use client";

import { useEffect, useMemo, useRef, useState } from "react";

export const ORIGINS = [
  { value: "sin-confirmar", label: "Sin confirmar (no se publica)" },
  { value: "propio", label: "Propio" },
  { value: "encargado", label: "Encargado a un diseñador" },
  { value: "licencia", label: "Con licencia" },
  { value: "dominio-publico", label: "Dominio público" },
] as const;
type Origin = (typeof ORIGINS)[number]["value"];

type Mode = "front" | "back" | "both";
type Side = "front" | "back" | "single";

type Staged = {
  id: string;
  file: File;
  url: string; // object URL for the preview
  side: Side;
  key: string;
  baseName: string;
  width: number;
  height: number;
  transparent: boolean;
  lum: number | null; // average brightness 0-255 of the visible art (null when it has a background)
  busy: string; // "" or what is being done to it (removing background...)
};

type Tone = "" | "negro" | "blanco";
type Meta = { name?: string; mode?: Mode; origin?: Origin; note?: string; tone?: Tone };

type Row = {
  key: string;
  front?: Staged;
  back?: Staged;
  art?: Staged; // a design with a single art
  defaultName: string;
};

type Status = "pending" | "uploading" | "ok" | "error";

const SIDE_SUFFIX = /[\s._-]*(frente|front|delantero|espalda|atras|atrás|back)$/i;

function parseName(fileName: string): { side: Side; key: string; name: string } {
  const base = fileName.replace(/\.[^.]+$/, "");
  const m = SIDE_SUFFIX.exec(base);
  const side: Side = m ? (/^(frente|front|delantero)$/i.test(m[1]) ? "front" : "back") : "single";
  const raw = (m ? base.slice(0, m.index) : base).trim() || base;
  const key = raw
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, "-");
  return { side, key, name: raw.replace(/[_-]+/g, " ").replace(/\s+/g, " ").trim() };
}

// Size in pixels and whether the image already has a see-through background, read in the browser.
async function analyze(file: File): Promise<{ width: number; height: number; transparent: boolean; lum: number | null }> {
  const bmp = await createImageBitmap(file);
  const { width, height } = bmp;
  let transparent = false;
  let lum: number | null = null;
  if (file.type !== "image/jpeg") {
    const scale = Math.min(1, 160 / Math.max(width, height));
    const w = Math.max(1, Math.round(width * scale));
    const h = Math.max(1, Math.round(height * scale));
    const canvas = document.createElement("canvas");
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext("2d");
    if (ctx) {
      ctx.drawImage(bmp, 0, 0, w, h);
      const data = ctx.getImageData(0, 0, w, h).data;
      let clear = 0;
      let sum = 0;
      let seen = 0;
      for (let i = 3; i < data.length; i += 4) {
        if (data[i] < 250) clear++;
        if (data[i] > 128) {
          sum += 0.299 * data[i - 3] + 0.587 * data[i - 2] + 0.114 * data[i - 1];
          seen++;
        }
      }
      transparent = clear / (w * h) > 0.03;
      if (transparent && seen > 0) lum = sum / seen;
    }
  }
  bmp.close();
  return { width, height, transparent, lum };
}

// Light art vanishes on a white garment and dark art on a black one: suggest where it will be seen.
function suggestTone(arts: Staged[]): Tone {
  const l = arts.map((a) => a.lum).filter((v): v is number => v != null);
  if (l.length === 0) return "";
  const mean = l.reduce((a, b) => a + b, 0) / l.length;
  return mean > 185 ? "negro" : mean < 70 ? "blanco" : "";
}

function quality(s: Staged): { label: string; tone: "ok" | "warn" | "bad" } {
  const longest = Math.max(s.width, s.height);
  if (longest >= 2400) return { label: `${s.width}×${s.height} · buena calidad`, tone: "ok" };
  if (longest >= 1200) return { label: `${s.width}×${s.height} · regular, puede verse suave`, tone: "warn" };
  return { label: `${s.width}×${s.height} · muy chico, se verá pixelado`, tone: "bad" };
}

const TONE = { ok: "bg-emerald-100 text-emerald-800", warn: "bg-amber-100 text-amber-800", bad: "bg-red-100 text-red-700" };

export default function BulkDesignUpload({ collectionId, onDone }: { collectionId: string; onDone: () => void }) {
  const [files, setFiles] = useState<Staged[]>([]);
  const [meta, setMeta] = useState<Record<string, Meta>>({});
  const [status, setStatus] = useState<Record<string, { state: Status; error?: string }>>({});
  const [dragging, setDragging] = useState(false);
  const [running, setRunning] = useState(false);
  const [summary, setSummary] = useState("");
  const input = useRef<HTMLInputElement>(null);
  const urls = useRef<string[]>([]);

  useEffect(() => () => urls.current.forEach((u) => URL.revokeObjectURL(u)), []);

  async function addFiles(list: FileList | File[]) {
    const accepted = [...list].filter((f) => /^image\/(png|jpeg|webp)$/.test(f.type)).slice(0, 60);
    if (accepted.length === 0) return;
    setSummary("");
    const staged: Staged[] = [];
    for (const file of accepted) {
      try {
        const info = await analyze(file);
        const parsed = parseName(file.name);
        const url = URL.createObjectURL(file);
        urls.current.push(url);
        staged.push({ id: `${file.name}-${file.size}-${file.lastModified}-${Math.random().toString(36).slice(2, 6)}`, file, url, side: parsed.side, key: parsed.key, baseName: parsed.name, ...info, busy: "" });
      } catch {
        // an unreadable image is skipped
      }
    }
    setFiles((prev) => [...prev, ...staged]);
  }

  // One design per front+back pair, and one per file that stands alone.
  const rows = useMemo<Row[]>(() => {
    const out: Row[] = [];
    const pairs = new Map<string, Row>();
    for (const f of files) {
      if (f.side === "single") {
        out.push({ key: f.id, art: f, defaultName: f.baseName });
        continue;
      }
      let row = pairs.get(f.key);
      if (!row) {
        row = { key: `pair-${f.key}`, defaultName: f.baseName };
        pairs.set(f.key, row);
        out.push(row);
      }
      if (f.side === "front" && !row.front) row.front = f;
      else if (f.side === "back" && !row.back) row.back = f;
      else out.push({ key: f.id, art: f, defaultName: f.baseName });
    }
    // A side that never found its pair is a design with a single art.
    return out.map((r) => {
      if (r.front && !r.back) return { key: r.key, art: r.front, defaultName: r.defaultName };
      if (r.back && !r.front) return { key: r.key, art: r.back, defaultName: r.defaultName, back: undefined };
      return r;
    });
  }, [files]);

  const isBackOnly = (r: Row) => !!r.art && r.art.side === "back";
  const get = (r: Row) => {
    const m = meta[r.key] ?? {};
    return {
      name: m.name ?? r.defaultName,
      mode: m.mode ?? (r.art ? (isBackOnly(r) ? "back" : "front") : "both"),
      origin: m.origin ?? "sin-confirmar",
      note: m.note ?? "",
      tone: (m.tone ?? suggestTone([r.front, r.back, r.art].filter(Boolean) as Staged[])) as Tone,
    } as { name: string; mode: Mode; origin: Origin; note: string; tone: Tone };
  };
  const setField = (key: string, patch: Meta) => setMeta((m) => ({ ...m, [key]: { ...m[key], ...patch } }));

  function removeRow(r: Row) {
    const ids = new Set([r.front?.id, r.back?.id, r.art?.id].filter(Boolean) as string[]);
    setFiles((prev) => prev.filter((f) => !ids.has(f.id)));
  }

  async function fixBackground(s: Staged, how: "white" | "subject") {
    setFiles((prev) => prev.map((f) => (f.id === s.id ? { ...f, busy: how === "white" ? "Quitando el fondo…" : "Aislando el sujeto (puede tardar)…" } : f)));
    try {
      const blob = how === "white" ? await (await import("@/lib/remove-white-bg")).removeWhiteBackground(s.url) : await (await import("@/lib/segment-subject")).segmentSubject(s.url);
      const file = new File([blob], s.file.name.replace(/\.[^.]+$/, "") + ".png", { type: "image/png" });
      const info = await analyze(file);
      const url = URL.createObjectURL(file);
      urls.current.push(url);
      setFiles((prev) => prev.map((f) => (f.id === s.id ? { ...f, file, url, ...info, busy: "" } : f)));
    } catch {
      setFiles((prev) => prev.map((f) => (f.id === s.id ? { ...f, busy: "" } : f)));
    }
  }

  async function upload(file: File): Promise<string> {
    const form = new FormData();
    form.append("file", file);
    const res = await fetch("/api/upload", { method: "POST", body: form });
    const data = await res.json();
    if (!res.ok || !data.url) throw new Error(data.error ?? "No se pudo subir la imagen.");
    return data.url as string;
  }

  async function publishAll() {
    setRunning(true);
    setSummary("");
    let published = 0;
    let saved = 0;
    let failed = 0;
    const done = new Set<string>();
    for (const r of rows) {
      const m = get(r);
      setStatus((s) => ({ ...s, [r.key]: { state: "uploading" } }));
      try {
        let body: Record<string, unknown>;
        if (r.front && r.back) {
          const [front, back] = [await upload(r.front.file), await upload(r.back.file)];
          body = { name: m.name, imageUrl: front, backImageUrl: back, placement: "FRONT", showFront: true, showBack: true };
        } else {
          const art = r.art as Staged;
          const url = await upload(art.file);
          body = { name: m.name, imageUrl: url, backImageUrl: "", placement: m.mode === "back" ? "BACK" : "FRONT", showFront: m.mode !== "back", showBack: m.mode !== "front" };
        }
        const res = await fetch(`/api/admin/collections/${collectionId}/designs`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ ...body, origin: m.origin, sourceNote: m.note, garmentColors: m.tone }),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error ?? "No se pudo guardar el diseño.");
        if (data.active) published++;
        else saved++;
        done.add(r.key);
        setStatus((s) => ({ ...s, [r.key]: { state: "ok" } }));
      } catch (e) {
        failed++;
        setStatus((s) => ({ ...s, [r.key]: { state: "error", error: e instanceof Error ? e.message : "Error." } }));
      }
    }
    // What went up leaves the list; what failed stays so it can be retried.
    setFiles((prev) => prev.filter((f) => !rows.some((r) => done.has(r.key) && [r.front?.id, r.back?.id, r.art?.id].includes(f.id))));
    setSummary(
      `${published} publicado${published === 1 ? "" : "s"}` +
        (saved ? ` · ${saved} guardado${saved === 1 ? "" : "s"} sin publicar (origen sin confirmar)` : "") +
        (failed ? ` · ${failed} con error (siguen en la lista)` : ""),
    );
    setRunning(false);
    onDone();
  }

  const unconfirmed = rows.filter((r) => get(r).origin === "sin-confirmar").length;

  return (
    <div className="space-y-4 rounded-xl border border-neutral-200 bg-white p-6">
      <div>
        <h2 className="text-lg font-semibold">Subida masiva de diseños</h2>
        <p className="mt-1 text-sm text-neutral-500">
          Arrastra muchos archivos de una vez. Un archivo = un diseño. Para un diseño con frente y espalda, nombra los archivos{" "}
          <code className="rounded bg-neutral-100 px-1">nombre-frente.png</code> y <code className="rounded bg-neutral-100 px-1">nombre-espalda.png</code>: se juntan solos.
          Revisa la calidad y marca de dónde viene cada diseño. <strong>Los de origen «sin confirmar» se guardan pero no se publican.</strong>
        </p>
      </div>

      <div
        onDragOver={(e) => {
          e.preventDefault();
          setDragging(true);
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDragging(false);
          addFiles(e.dataTransfer.files);
        }}
        className={`flex flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed px-4 py-8 text-center transition ${dragging ? "border-emerald-500 bg-emerald-50" : "border-neutral-300 bg-neutral-50"}`}
      >
        <p className="text-sm text-neutral-600">Suelta aquí tus imágenes (PNG con fondo transparente es lo ideal; también JPG o WEBP)</p>
        <button type="button" onClick={() => input.current?.click()} className="rounded-md bg-neutral-900 px-4 py-2 text-sm font-medium text-white">
          Elegir archivos
        </button>
        <input
          ref={input}
          type="file"
          multiple
          accept="image/png,image/jpeg,image/webp"
          className="hidden"
          onChange={(e) => {
            if (e.target.files) addFiles(e.target.files);
            e.target.value = "";
          }}
        />
      </div>

      {rows.length > 0 && (
        <>
          <ul className="space-y-3">
            {rows.map((r) => {
              const m = get(r);
              const st = status[r.key];
              const arts = [r.front, r.back, r.art].filter(Boolean) as Staged[];
              return (
                <li key={r.key} className="rounded-lg border border-neutral-200 p-3">
                  <div className="flex flex-wrap gap-4">
                    <div className="flex gap-2">
                      {arts.map((a) => (
                        <div key={a.id} className="w-28">
                          <div className="flex aspect-square items-center justify-center overflow-hidden rounded-md bg-[conic-gradient(#e5e5e5_25%,#fff_0_50%,#e5e5e5_0_75%,#fff_0)] bg-[length:16px_16px]">
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img src={a.url} alt="" className="h-full w-full object-contain" />
                          </div>
                          <p className="mt-1 text-[11px] font-semibold uppercase text-neutral-500">{r.front && r.back ? (a === r.front ? "Frente" : "Espalda") : "Imagen"}</p>
                          <span className={`mt-0.5 block rounded px-1.5 py-0.5 text-[10px] leading-tight ${TONE[quality(a).tone]}`}>{quality(a).label}</span>
                          {a.transparent ? (
                            <span className="mt-0.5 block rounded bg-emerald-100 px-1.5 py-0.5 text-[10px] text-emerald-800">Fondo transparente</span>
                          ) : (
                            <div className="mt-0.5 space-y-1">
                              <span className="block rounded bg-amber-100 px-1.5 py-0.5 text-[10px] leading-tight text-amber-800">Tiene fondo (se vería como un recuadro)</span>
                              <button type="button" disabled={!!a.busy} onClick={() => fixBackground(a, "white")} className="block w-full rounded border border-neutral-300 px-1 py-1 text-[10px] font-medium hover:bg-neutral-50 disabled:opacity-50">
                                Quitar fondo blanco
                              </button>
                              <button type="button" disabled={!!a.busy} onClick={() => fixBackground(a, "subject")} className="block w-full rounded border border-neutral-300 px-1 py-1 text-[10px] font-medium hover:bg-neutral-50 disabled:opacity-50">
                                Aislar sujeto (IA)
                              </button>
                            </div>
                          )}
                          {a.busy && <p className="mt-1 text-[10px] text-neutral-500">{a.busy}</p>}
                        </div>
                      ))}
                    </div>

                    <div className="min-w-[14rem] flex-1 space-y-2">
                      <input value={m.name} onChange={(e) => setField(r.key, { name: e.target.value })} aria-label="Nombre del diseño" className="w-full rounded-md border border-neutral-300 px-3 py-1.5 text-sm" />
                      {r.art && (
                        <select value={m.mode} onChange={(e) => setField(r.key, { mode: e.target.value as Mode })} aria-label="Dónde se imprime" className="w-full rounded-md border border-neutral-300 px-2 py-1.5 text-sm">
                          <option value="front">Solo frente</option>
                          <option value="back">Solo espalda</option>
                          <option value="both">Frente y espalda (la misma imagen)</option>
                        </select>
                      )}
                      <select value={m.origin} onChange={(e) => setField(r.key, { origin: e.target.value as Origin })} aria-label="Origen del diseño" className={`w-full rounded-md border px-2 py-1.5 text-sm ${m.origin === "sin-confirmar" ? "border-amber-400 bg-amber-50" : "border-neutral-300"}`}>
                        {ORIGINS.map((o) => (
                          <option key={o.value} value={o.value}>
                            {o.label}
                          </option>
                        ))}
                      </select>
                      <input value={m.note} onChange={(e) => setField(r.key, { note: e.target.value })} placeholder="Quién lo hizo o de dónde viene (licencia, diseñador, enlace…)" aria-label="Nota de origen" className="w-full rounded-md border border-neutral-300 px-3 py-1.5 text-sm" />
                      <label className="flex items-center gap-2 text-xs text-neutral-600">
                        <span className="shrink-0">Se ve bien en</span>
                        <select value={m.tone} onChange={(e) => setField(r.key, { tone: e.target.value as Tone })} aria-label="Prendas donde se ve bien" className="w-full rounded-md border border-neutral-300 px-2 py-1.5 text-sm">
                          <option value="">Prendas negras y blancas</option>
                          <option value="negro">Solo prendas negras (diseño claro)</option>
                          <option value="blanco">Solo prendas blancas (diseño oscuro)</option>
                        </select>
                      </label>
                      {m.tone === "negro" && <p className="text-[11px] text-neutral-500">Diseño claro: en una prenda blanca no se vería, así que solo se muestra en negras.</p>}
                      {m.tone === "blanco" && <p className="text-[11px] text-neutral-500">Diseño oscuro: en una prenda negra no se vería, así que solo se muestra en blancas.</p>}
                      <div className="flex items-center justify-between text-xs">
                        <span className={st?.state === "ok" ? "text-emerald-700" : st?.state === "error" ? "text-red-600" : "text-neutral-400"}>
                          {st?.state === "uploading" ? "Subiendo…" : st?.state === "ok" ? "Listo" : st?.state === "error" ? st.error : ""}
                        </span>
                        <button type="button" disabled={running} onClick={() => removeRow(r)} className="text-red-600 hover:underline disabled:opacity-50">
                          Quitar de la lista
                        </button>
                      </div>
                    </div>
                  </div>
                </li>
              );
            })}
          </ul>

          <div className="flex flex-wrap items-center gap-3">
            <button type="button" onClick={publishAll} disabled={running || files.some((f) => f.busy)} className="rounded-md bg-neutral-900 px-5 py-2 text-sm font-medium text-white disabled:opacity-50">
              {running ? "Subiendo…" : `Subir ${rows.length} diseño${rows.length === 1 ? "" : "s"}`}
            </button>
            {unconfirmed > 0 && <span className="text-sm text-amber-700">{unconfirmed} sin origen confirmado: se guardarán sin publicar.</span>}
          </div>
        </>
      )}

      {summary && <p className="rounded-md bg-neutral-100 px-3 py-2 text-sm font-medium text-neutral-800">{summary}</p>}
    </div>
  );
}
