import { readdir, stat, statfs, unlink } from "fs/promises";
import path from "path";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { uploadsDir } from "@/lib/storage";

// Every /uploads/<file> URL that's still genuinely in use somewhere: product photos, collection
// designs, past orders (both the cart-preview thumbnail and each view's design, current and
// original), the hero photo, and any image/video the owner uploaded through the editable-content
// panel (SiteText rows whose key starts with "image." or "video."). A customer's design that's
// only sitting in their cart isn't in this set — that lives in their browser, not the database —
// which is exactly why cleanup only ever touches files older than KEEP_DAYS.
async function referencedFilenames(): Promise<Set<string>> {
  const [views, presets, orderItems, settings, siteTexts] = await Promise.all([
    prisma.productView.findMany({ select: { imageUrl: true } }),
    prisma.presetDesign.findMany({ select: { imageUrl: true } }),
    prisma.orderItem.findMany({ select: { previewImageUrl: true, designPlacement: true } }),
    prisma.storeSettings.findUnique({ where: { id: "singleton" }, select: { heroImageUrl: true } }),
    prisma.siteText.findMany({ where: { OR: [{ key: { startsWith: "image." } }, { key: { startsWith: "video." } }] }, select: { value: true } }),
  ]);

  const urls = new Set<string>();
  const add = (u: string | null | undefined) => {
    if (u && u.startsWith("/uploads/")) urls.add(u.slice("/uploads/".length));
  };

  for (const v of views) add(v.imageUrl);
  for (const p of presets) add(p.imageUrl);
  if (settings) add(settings.heroImageUrl);
  for (const t of siteTexts) add(t.value);
  for (const oi of orderItems) {
    add(oi.previewImageUrl);
    try {
      const placement = JSON.parse(oi.designPlacement) as Record<string, { designUrl?: string; originalDesignUrl?: string }>;
      for (const view of Object.values(placement)) {
        add(view?.designUrl);
        add(view?.originalDesignUrl);
      }
    } catch {
      // malformed/legacy row: nothing to add, not fatal
    }
  }
  return urls;
}

// Never touch a file younger than this — it could be sitting in a customer's cart (browser-only,
// not in any DB table) mid-purchase, or an order that's about to be created.
const KEEP_DAYS = 3;

async function scan() {
  const dir = uploadsDir();
  let names: string[];
  try {
    names = await readdir(dir);
  } catch {
    return { dir, files: [], totalBytes: 0 };
  }
  const referenced = await referencedFilenames();
  const cutoff = Date.now() - KEEP_DAYS * 24 * 60 * 60 * 1000;
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
    keepDays: KEEP_DAYS,
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
