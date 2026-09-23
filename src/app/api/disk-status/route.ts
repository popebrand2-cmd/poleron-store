import { readdir, stat, statfs } from "fs/promises";
import path from "path";
import { NextResponse } from "next/server";
import { uploadsDir } from "@/lib/storage";

// TEMPORARY read-only diagnostic (to be removed): where is the persistent volume's space going?
export const dynamic = "force-dynamic";

export async function GET() {
  const dir = uploadsDir();
  const out: Record<string, unknown> = { dir };
  try {
    const s = await statfs(dir);
    out.diskTotalMB = Math.round((s.blocks * s.bsize) / 1048576);
    out.diskFreeMB = Math.round((s.bavail * s.bsize) / 1048576);
  } catch (e) {
    out.statfsError = String(e);
  }
  try {
    const names = await readdir(dir);
    const files = (await Promise.all(names.map(async (n) => ({ n, s: await stat(path.join(dir, n)).catch(() => null) }))))
      .filter((f) => f.s && f.s.isFile())
      .map((f) => ({ name: f.n, mb: +(f.s!.size / 1048576).toFixed(2), days: Math.round((Date.now() - f.s!.mtimeMs) / 86400000) }));
    out.uploadsCount = files.length;
    out.uploadsMB = Math.round(files.reduce((a, f) => a + f.mb, 0));
    out.olderThan3Days = files.filter((f) => f.days >= 3).length;
    out.largest = files.sort((a, b) => b.mb - a.mb).slice(0, 12);
  } catch (e) {
    out.readdirError = String(e);
  }
  try {
    const dbPath = (process.env.DATABASE_URL || "").replace(/^file:/, "");
    if (dbPath) out.dbMB = +((await stat(dbPath)).size / 1048576).toFixed(2);
    const dataDir = path.dirname(dbPath);
    out.dataDirEntries = await Promise.all(
      (await readdir(dataDir)).map(async (n) => ({ n, mb: +(((await stat(path.join(dataDir, n)).catch(() => null))?.size ?? 0) / 1048576).toFixed(2) })),
    );
  } catch (e) {
    out.dbError = String(e);
  }
  return NextResponse.json(out);
}
