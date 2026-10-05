import { createHash } from "crypto";
import { mkdir, readFile, stat, writeFile } from "fs/promises";
import os from "os";
import path from "path";
import sharp from "sharp";
import { NextResponse } from "next/server";
import { uploadsDir } from "@/lib/storage";

export const runtime = "nodejs";

// Cleans up a product photo for the collection cards: removes a flat white background (so the garment has
// a real outline for the halo and sits on the card), and lifts the shadows of dark garments, which studio
// photos tend to leave as a flat black blob. The owner's original upload is never touched; the result is cached.
const MAX_WIDTH = 1400;
const CACHE_DIR = path.join(os.tmpdir(), "pope-garment-cache");

async function clean(buf: Buffer): Promise<Buffer> {
  const meta = await sharp(buf).metadata();
  const { data, info } = await sharp(buf)
    .rotate()
    .resize({ width: Math.min(meta.width ?? MAX_WIDTH, MAX_WIDTH), withoutEnlargement: true })
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });
  const { width: W, height: H } = info;
  const N = W * H;

  const lum = new Float32Array(N);
  const minC = new Uint8Array(N);
  for (let i = 0; i < N; i++) {
    const r = data[i * 4], g = data[i * 4 + 1], b = data[i * 4 + 2];
    lum[i] = 0.299 * r + 0.587 * g + 0.114 * b;
    minC[i] = Math.min(r, g, b);
  }

  const alphaAt = (i: number) => data[i * 4 + 3];
  const hasTransparency = [0, W - 1, (H - 1) * W, N - 1].some((i) => alphaAt(i) < 200);

  // Dark or light garment? Mean brightness of everything that is not paper-white.
  let sum = 0, count = 0;
  for (let i = 0; i < N; i++) if (alphaAt(i) > 200 && lum[i] < 235) { sum += lum[i]; count++; }
  const dark = count > 0 && sum / count < 110;
  // Core colour of a dark garment (ignoring the light fringe), used to separate the garment from the white.
  let coreSum = 0, coreCount = 0;
  for (let i = 0; i < N; i++) if (alphaAt(i) > 200 && lum[i] < 90) { coreSum += lum[i]; coreCount++; }
  const core = coreCount > 0 ? coreSum / coreCount : 30;

  const bg = new Uint8Array(N);
  if (!hasTransparency) {
    const thr = dark ? 226 : 251;
    const stack = new Int32Array(N);
    let sp = 0;
    const push = (i: number) => {
      if (!bg[i] && minC[i] >= thr) { bg[i] = 1; stack[sp++] = i; }
    };
    for (let x = 0; x < W; x++) { push(x); push((H - 1) * W + x); }
    for (let y = 0; y < H; y++) { push(y * W); push(y * W + W - 1); }
    while (sp) {
      const p = stack[--sp];
      const x = p % W, y = (p / W) | 0;
      if (x > 0) push(p - 1);
      if (x < W - 1) push(p + 1);
      if (y > 0) push(p - W);
      if (y < H - 1) push(p + W);
    }
    // Dark garments: white pockets fully enclosed by the garment (a gap between an arm and the body) are
    // background too. Any sizeable near-white island is removed; tiny ones (stitching highlights) are kept.
    if (dark) {
      const seen = new Uint8Array(N);
      const island: number[] = [];
      for (let s0 = 0; s0 < N; s0++) {
        if (bg[s0] || seen[s0] || minC[s0] < thr) continue;
        island.length = 0;
        let sp2 = 0;
        stack[sp2++] = s0;
        seen[s0] = 1;
        while (sp2) {
          const p = stack[--sp2];
          island.push(p);
          const x = p % W, y = (p / W) | 0;
          const nb = [x > 0 ? p - 1 : -1, x < W - 1 ? p + 1 : -1, y > 0 ? p - W : -1, y < H - 1 ? p + W : -1];
          for (const q of nb) if (q >= 0 && !bg[q] && !seen[q] && minC[q] >= thr) { seen[q] = 1; stack[sp2++] = q; }
        }
        if (island.length >= 600) for (const p of island) bg[p] = 1;
      }
    }
    // Only trust the cut when it removed a real background, not half the garment.
    let removed = 0;
    for (let i = 0; i < N; i++) removed += bg[i];
    if (removed < N * 0.05 || removed > N * 0.92) bg.fill(0);
  }
  const cut = bg.some((v) => v === 1);

  const out = Buffer.from(data);
  if (cut) {
    // Fringe next to the background: the edge pixels are a blend of garment and white. Work out how much
    // garment each one really has and remove the white, so no light outline is left around the garment.
    const passes = dark ? 4 : 2;
    const ring = new Uint8Array(N);
    let prev = bg;
    for (let pass = 0; pass < passes; pass++) {
      const next = new Uint8Array(N);
      for (let y = 1; y < H - 1; y++) for (let x = 1; x < W - 1; x++) {
        const i = y * W + x;
        if (bg[i] || ring[i]) continue;
        if (prev[i - 1] || prev[i + 1] || prev[i - W] || prev[i + W]) next[i] = 1;
      }
      for (let i = 0; i < N; i++) if (next[i]) ring[i] = 1;
      prev = next;
    }
    for (let i = 0; i < N; i++) {
      if (bg[i]) { out[i * 4 + 3] = 0; continue; }
      if (!ring[i]) continue;
      const a = dark ? Math.min(1, Math.max(0, (255 - lum[i]) / (255 - core))) : Math.min(1, Math.max(0.15, (250 - lum[i]) / 130));
      if (a < 0.1) { out[i * 4 + 3] = 0; continue; }
      for (let c = 0; c < 3; c++) out[i * 4 + c] = Math.max(0, Math.min(255, Math.round((data[i * 4 + c] - 255 * (1 - a)) / a)));
      out[i * 4 + 3] = Math.round(a * 255);
    }
  }

  // Dark garments: studio photos leave them as one flat black blob. A gamma curve lifts the shadows (a near-black 20 ->
  // ~38, a dark grey 60 -> ~90) so the folds, seams and fabric read, and the garment looks charcoal instead of a hole.
  if (dark) {
    const lift = new Uint8Array(256);
    for (let v = 0; v < 256; v++) lift[v] = Math.round(255 * Math.pow(v / 255, 0.74));
    for (let i = 0; i < N; i++) {
      if (out[i * 4 + 3] === 0) continue;
      for (let c = 0; c < 3; c++) out[i * 4 + c] = lift[out[i * 4 + c]];
    }
  }

  // Local contrast (a wide, gentle sharpen) brings the folds out; the lifted dark garments need it, light ones don't.
  const img = sharp(out, { raw: { width: W, height: H, channels: 4 } });
  return (dark ? img.sharpen({ sigma: 2.5, m1: 0.3, m2: 2.2 }) : img).png({ compressionLevel: 8 }).toBuffer();
}

export async function GET(request: Request) {
  const url = new URL(request.url);
  const f = url.searchParams.get("f") ?? "";
  if (!/^[A-Za-z0-9._-]+\.(png|jpe?g|webp)$/i.test(f) || f.includes("..")) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  const file = path.join(uploadsDir(), f);
  let mtime = 0;
  try {
    mtime = (await stat(file)).mtimeMs;
  } catch {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const key = createHash("sha1").update(`${f}:${mtime}:v3`).digest("hex");
  const cached = path.join(CACHE_DIR, `${key}.png`);
  let body: Buffer;
  try {
    body = await readFile(cached);
  } catch {
    try {
      body = await clean(await readFile(file));
    } catch {
      // Anything unreadable: fall back to the original so a card never loses its photo.
      return NextResponse.redirect(new URL(`/uploads/${f}`, request.url), 307);
    }
    try {
      await mkdir(CACHE_DIR, { recursive: true });
      await writeFile(cached, body);
    } catch {
      // cache is best-effort
    }
  }
  return new NextResponse(new Uint8Array(body), {
    headers: { "Content-Type": "image/png", "Cache-Control": "public, max-age=31536000, immutable" },
  });
}
