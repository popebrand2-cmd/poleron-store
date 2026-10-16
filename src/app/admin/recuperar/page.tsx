import { readdir, readFile } from "fs/promises";
import path from "path";
import AdminNav from "@/components/admin/AdminNav";

export const dynamic = "force-dynamic";

// Owner only. Searches the raw bytes of the database file (and the copies made at each start, see scripts/snapshot-db.js) for a
// text — a customer's name, e-mail or order id. A deleted order is not wiped at once: its data stays in free space of the file until
// new data reuses it, so its name, address, phone and products can often still be read here and the order rebuilt.
function dbFiles(): { file: string; dir: string } | null {
  const m = /^file:(.+)$/.exec(process.env.DATABASE_URL || "");
  if (!m) return null;
  let file = m[1].split("?")[0];
  if (!path.isAbsolute(file)) file = path.join(process.cwd(), "prisma", file);
  return { file, dir: path.dirname(file) };
}

function readable(buf: Buffer): string {
  // Bytes of a SQLite page: keep the text, turn binary noise into a separator.
  return buf
    .toString("utf8")
    .replace(/[\u0000-\u0008\u000b-\u001f\u007f�]+/g, " ¦ ")
    .replace(/( ¦ )+/g, " ¦ ");
}

export default async function RecoverPage({ searchParams }: { searchParams: Promise<{ q?: string }> }) {
  const { q = "" } = await searchParams;
  const query = q.trim();
  const where = dbFiles();
  const results: { source: string; text: string }[] = [];

  if (query.length >= 3 && where) {
    const names = [path.basename(where.file), ...(await readdir(where.dir).catch(() => [] as string[])).filter((n) => /^recovery-\d{8}-\d{6}\.db$/.test(n)).sort().reverse()];
    const needle = Buffer.from(query.toLowerCase(), "utf8");
    const seen = new Set<string>();
    for (const name of names) {
      const buf = await readFile(path.join(where.dir, name)).catch(() => null);
      if (!buf) continue;
      const lower = Buffer.from(buf.toString("latin1").toLowerCase(), "latin1");
      let from = 0;
      let hits = 0;
      while (hits < 12) {
        const at = lower.indexOf(needle, from);
        if (at < 0) break;
        from = at + needle.length;
        const text = readable(buf.subarray(Math.max(0, at - 700), Math.min(buf.length, at + 1300))).trim();
        const key = text.slice(0, 200);
        if (seen.has(key)) continue;
        seen.add(key);
        results.push({ source: name === path.basename(where.file) ? "Base actual" : `Copia ${name.slice(9, 24)}`, text });
        hits++;
      }
    }
  }

  return (
    <main className="mx-auto max-w-5xl p-4 sm:p-6">
      <div className="mb-6 flex flex-col items-start gap-3 sm:flex-row sm:items-center sm:justify-between">
        <h1 className="text-2xl font-semibold">Recuperar un pedido borrado</h1>
        <AdminNav current="/admin/recuperar" />
      </div>
      <p className="mb-4 max-w-2xl text-sm text-neutral-500">
        Escribe el nombre del cliente, su correo o su teléfono. Si los datos del pedido siguen guardados en el archivo de la base, aparecen aquí
        abajo (dirección, productos, talla). Mándale una captura a quien te ayuda con la tienda para volver a crear el pedido.
      </p>
      <form className="mb-6 flex gap-2">
        <input name="q" defaultValue={query} placeholder="Ej: Karen medina" className="w-full rounded-lg border border-neutral-300 px-3 py-2" />
        <button className="rounded-full bg-neutral-900 px-5 py-2 text-sm font-semibold text-white">Buscar</button>
      </form>
      {query.length >= 3 && results.length === 0 && <p className="text-sm text-neutral-500">No se encontró nada con «{query}».</p>}
      <div className="space-y-4">
        {results.map((r, i) => (
          <div key={i} className="rounded-xl border border-neutral-200 p-3">
            <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-neutral-500">{r.source}</p>
            <pre className="whitespace-pre-wrap break-all text-xs leading-relaxed">{r.text}</pre>
          </div>
        ))}
      </div>
    </main>
  );
}
