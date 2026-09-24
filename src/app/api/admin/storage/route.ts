import { readdir, stat, statfs, unlink } from "fs/promises";
import path from "path";
import { NextResponse } from "next/server";
import { uploadsDir } from "@/lib/storage";
import { referencedFilenames, UNUSED_FILE_MAX_AGE_MS } from "@/lib/upload-cleanup";

async function scan() {
  const dir = uploadsDir();
  let names: string[];
  try {
    names = await readdir(dir);
  } catch {
    return { dir, files: [], totalBytes: 0 };
  }
  const referenced = await referencedFilenames();
  const cutoff = Date.now() - UNUSED_FILE_MAX_AGE_MS;
  const files = await Promise.all(
    names.map(async (name) => {
      const full = path.join(dir, name);
      const st = await stat(full).catch(() => null);
      if (!st || !st.isFile()) return null;
      return {
        name,
        bytes: st.size,
        mtimeMs: st.mtimeMs,
        referenced: referenced.has(name),
        deletable: !referenced.has(name) && st.mtimeMs < cutoff,
      };
    }),
  );
  const valid = files.filter((f): f is NonNullable<typeof f> => f !== null);
  return { dir, files: valid, totalBytes: valid.reduce((s, f) => s + f.bytes, 0) };
}

// Size and free space of the whole volume (database + uploads live on it), not just the uploads folder.
async function diskInfo(dir: string) {
  try {
    const s = await statfs(dir);
    return { totalBytes: s.blocks * s.bsize, freeBytes: s.bavail * s.bsize };
  } catch {
    return null;
  }
}

export async function GET() {
  const { dir, files, totalBytes } = await scan();
  const deletable = files.filter((f) => f.deletable);
  return NextResponse.json({
    dir,
    fileCount: files.length,
    totalBytes,
    deletableCount: deletable.length,
    deletableBytes: deletable.reduce((s, f) => s + f.bytes, 0),
    oldestMtimeMs: files.length ? Math.min(...files.map((f) => f.mtimeMs)) : null,
    keepHours: UNUSED_FILE_MAX_AGE_MS / 3600000,
    disk: await diskInfo(dir),
  });
}

export async function POST() {
  const { dir, files } = await scan();
  const toDelete = files.filter((f) => f.deletable);
  let freedBytes = 0;
  let deleted = 0;
  const errors: string[] = [];
  for (const f of toDelete) {
    try {
      await unlink(path.join(dir, f.name));
      freedBytes += f.bytes;
      deleted++;
    } catch (e) {
      errors.push(`${f.name}: ${e instanceof Error ? e.message : String(e)}`);
    }
  }
  return NextResponse.json({ deleted, freedBytes, errors });
}
