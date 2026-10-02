import { createHash } from "crypto";
import { mkdir, readFile, stat, writeFile } from "fs/promises";
import os from "os";
import path from "path";
import sharp from "sharp";
import { NextResponse } from "next/server";
import { uploadsDir } from "@/lib/storage";

export const runtime = "nodejs";

// Cleans up a product photo for the collection cards: removes a flat white background (so the garment has
// a real outline for the halo and sits on the card), and deepens the blacks of dark garments, which studio
// photos tend to leave washed-out grey. The owner's original upload is never touched; the result is cached.
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
    // Only trust the cut when it removed a real background, not half the garment.
    let removed = 0;
    for (let i = 0; i < N; i++) removed += bg[i];
    if (removed < N * 0.05 || removed > N * 0.92) bg.fill(0);
  }
  const cut = bg.some((v) => v === 1);

  const out = Buffer.from(data);
  if (cut) {
    // Two-pixel fringe next to the background: un-mix the white so no light halo is left around the garment.
    const ring = new Uint8Array(N);
    let prev = bg;
    for (let pass = 0; pass < 2; pass++) {
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
      const a = Math.min(1, Math.max(0.15, (250 - lum[i]) / 130));
      for (let c = 0; c < 3; c++) out[i * 4 + c] = Math.max(0, Math.min(255, Math.round((data[i * 4 + c] - 255 * (1 - a)) / a)));
      out[i * 4 + 3] = Math.round(a * 255);
    }
  }

  if (dark) {
    for (let i = 0; i < N; i++) {
      if (out[i * 4 + 3] === 0) continue;
      for (let c = 0; c < 3; c++) out[i * 4 + c] = Math.max(0, Math.min(255, Math.round((out[i * 4 + c] - 24) * 1.22)));
    }
  }

  return sharp(out, { raw: { width: W, height: H, channels: 4 } }).png({ compressionLevel: 8 }).toBuffer();
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

  const key = createHash("sha1").update(`${f}:${mtime}:v1`).digest("hex");
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
