import { readdir, readFile, rename, stat, statfs, unlink, writeFile } from "fs/promises";
import path from "path";
import { NextResponse } from "next/server";
import { uploadsDir } from "@/lib/storage";
import { referencedFilenames, UNUSED_FILE_MAX_AGE_MS } from "@/lib/upload-cleanup";
import { shrinkImage, SHRINK_MIN_BYTES } from "@/lib/image-shrink";

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
  const isImage = (n: string) => /\.(png|jpe?g|webp)$/i.test(n);
  const shrinkable = files.filter((f) => isImage(f.name) && f.bytes >= SHRINK_MIN_BYTES);
  const videos = files.filter((f) => /\.(mp4|webm|mov)$/i.test(f.name));
  const heaviest = [...files]
    .sort((a, b) => b.bytes - a.bytes)
    .slice(0, 8)
    .map((f) => ({ name: f.name, bytes: f.bytes, referenced: f.referenced }));
  return NextResponse.json({
    shrinkableCount: shrinkable.length,
    shrinkableBytes: shrinkable.reduce((s, f) => s + f.bytes, 0),
    videoCount: videos.length,
    videoBytes: videos.reduce((s, f) => s + f.bytes, 0),
    heaviest,
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

// Re-encodes the heavy photos in place (same name, same format, same transparency; only pictures bigger than 4096 px are
// scaled down). Files are replaced atomically, so a visitor never gets a half-written image.
async function shrinkAll() {
  const { dir, files } = await scan();
  let shrunk = 0;
  let savedBytes = 0;
  for (const f of files) {
    if (!/\.(png|jpe?g|webp)$/i.test(f.name) || f.bytes < SHRINK_MIN_BYTES) continue;
    const full = path.join(dir, f.name);
    try {
      const input = await readFile(full);
      const out = await shrinkImage(input, path.extname(f.name));
      if (!out) continue;
      const tmp = `${full}.shrink`;
      await writeFile(tmp, out);
      await rename(tmp, full);
      shrunk++;
      savedBytes += input.byteLength - out.byteLength;
    } catch {
      // leave that file as it was
    }
  }
  return { shrunk, savedBytes };
}

export async function POST(request: Request) {
  const body = (await request.json().catch(() => ({}))) as { action?: string };
  if (body.action === "shrink") return NextResponse.json(await shrinkAll());
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
