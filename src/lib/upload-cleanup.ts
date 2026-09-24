import { readdir, stat, unlink } from "fs/promises";
import path from "path";
import { prisma } from "@/lib/prisma";
import { uploadsDir } from "@/lib/storage";
import { SITE_TEXT_DEFAULTS } from "@/lib/site-content";

// A file nobody references (not in a product, collection, page or order) is deleted after this long.
// It has to outlast a normal design session and a cart left open while the customer decides, but not
// more: once it is gone the cart/checkout asks them to upload the design again.
export const UNUSED_FILE_MAX_AGE_MS = 2 * 60 * 60 * 1000;
const STALE_UNPAID_ORDER_MS = 3 * 24 * 60 * 60 * 1000;

type Placement = Record<string, { designUrl?: string; originalDesignUrl?: string; [k: string]: unknown }>;

function uploadName(u: string | null | undefined): string | null {
  return u && u.startsWith("/uploads/") ? u.slice("/uploads/".length) : null;
}

export function orderItemNames(item: { previewImageUrl: string; designPlacement: string }): string[] {
  const names: (string | null)[] = [uploadName(item.previewImageUrl)];
  try {
    for (const view of Object.values(JSON.parse(item.designPlacement) as Placement)) {
      names.push(uploadName(view?.designUrl), uploadName(view?.originalDesignUrl));
    }
  } catch {
    // malformed/legacy row: nothing to add
  }
  return names.filter((n): n is string => Boolean(n));
}

// Every /uploads/<file> that is genuinely in use somewhere: product photos, collection designs, the
// hero photo, editable-content images/videos (including the defaults shipped in code) and every
// order that still holds its files.
export async function referencedFilenames(): Promise<Set<string>> {
  const [views, presets, orderItems, settings, siteTexts] = await Promise.all([
    prisma.productView.findMany({ select: { imageUrl: true } }),
    prisma.presetDesign.findMany({ select: { imageUrl: true } }),
    prisma.orderItem.findMany({ select: { previewImageUrl: true, designPlacement: true } }),
    prisma.storeSettings.findUnique({ where: { id: "singleton" }, select: { heroImageUrl: true } }),
    prisma.siteText.findMany({ where: { OR: [{ key: { startsWith: "image." } }, { key: { startsWith: "video." } }] }, select: { value: true } }),
  ]);
  const names = new Set<string>();
  const add = (u: string | null | undefined) => {
    const n = uploadName(u);
    if (n) names.add(n);
  };
  for (const v of views) add(v.imageUrl);
  for (const p of presets) add(p.imageUrl);
  if (settings) add(settings.heroImageUrl);
  for (const t of siteTexts) add(t.value);
  for (const d of Object.values(SITE_TEXT_DEFAULTS)) add(d);
  for (const oi of orderItems) for (const n of orderItemNames(oi)) names.add(n);
  return names;
}

async function removeFiles(candidates: string[]): Promise<{ deleted: number; freedBytes: number }> {
  const dir = uploadsDir();
  let deleted = 0;
  let freedBytes = 0;
  for (const name of candidates) {
    if (name.includes("/") || name.includes("\\") || name.includes("..")) continue;
    const full = path.join(dir, name);
    try {
      const st = await stat(full);
      await unlink(full);
      deleted++;
      freedBytes += st.size;
    } catch {
      // already gone
    }
  }
  return { deleted, freedBytes };
}

// The order is finished (or abandoned): drop the customer's original image, the processed design and
// the mockup. The order row itself stays (totals, address, sizes) — only the files go.
export async function releaseOrderFiles(orderId: string): Promise<{ deleted: number }> {
  const items = await prisma.orderItem.findMany({ where: { orderId }, select: { id: true, previewImageUrl: true, designPlacement: true } });
  const names = new Set<string>();
  for (const it of items) {
    for (const n of orderItemNames(it)) names.add(n);
    let cleaned = it.designPlacement;
    try {
      const placement = JSON.parse(it.designPlacement) as Placement;
      for (const view of Object.values(placement)) {
        if (view) {
          view.designUrl = "";
          delete view.originalDesignUrl;
        }
      }
      cleaned = JSON.stringify(placement);
    } catch {
      // leave as is
    }
    await prisma.orderItem.update({ where: { id: it.id }, data: { designPlacement: cleaned, previewImageUrl: "" } });
  }
  // Only delete what no other record (another order, a collection...) still points at.
  const stillUsed = await referencedFilenames();
  const { deleted } = await removeFiles([...names].filter((n) => !stillUsed.has(n)));
  return { deleted };
}

// Deletes unreferenced files older than UNUSED_FILE_MAX_AGE_MS, and first frees the files of orders
// that will never be produced (cancelled, or unpaid for 3 days).
export async function sweepUnusedFiles(): Promise<{ deleted: number; freedBytes: number }> {
  const dead = await prisma.order.findMany({
    where: { OR: [{ status: "CANCELLED" }, { status: "PENDING_PAYMENT", createdAt: { lt: new Date(Date.now() - STALE_UNPAID_ORDER_MS) } }] },
    select: { id: true, items: { select: { previewImageUrl: true, designPlacement: true } } },
  });
  for (const o of dead) {
    if (o.items.some((it) => orderItemNames(it).length > 0)) await releaseOrderFiles(o.id);
  }

  const dir = uploadsDir();
  let names: string[];
  try {
    names = await readdir(dir);
  } catch {
    return { deleted: 0, freedBytes: 0 };
  }
  const used = await referencedFilenames();
  const cutoff = Date.now() - UNUSED_FILE_MAX_AGE_MS;
  const old: string[] = [];
  for (const n of names) {
    if (used.has(n)) continue;
    const st = await stat(path.join(dir, n)).catch(() => null);
    if (st && st.isFile() && st.mtimeMs < cutoff) old.push(n);
  }
  return removeFiles(old);
}

let lastSweep = 0;
let sweeping = false;
// Called after each upload: at most one sweep every 10 minutes, in the background, so no cron is needed.
export function scheduleSweep(): void {
  if (sweeping || Date.now() - lastSweep < 10 * 60 * 1000) return;
  sweeping = true;
  lastSweep = Date.now();
  sweepUnusedFiles()
    .catch(() => undefined)
    .finally(() => {
      sweeping = false;
    });
}
