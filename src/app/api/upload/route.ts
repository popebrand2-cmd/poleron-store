import { mkdir, writeFile } from "fs/promises";
import path from "path";
import { NextResponse } from "next/server";
import { v4 as uuidv4 } from "uuid";
import { uploadsDir } from "@/lib/storage";
import { scheduleSweep } from "@/lib/upload-cleanup";

const ALLOWED_TYPES: Record<string, string> = {
  "image/png": "png",
  "image/jpeg": "jpg",
  "image/webp": "webp",
  "image/svg+xml": "svg",
};

// Modern phone cameras (even after iOS converts HEIC to JPEG on the way out of the picker)
// routinely produce 15-25MB photos, so 15MB was rejecting ordinary customer uploads.
const MAX_BYTES = 30 * 1024 * 1024; // 30MB

async function saveBytes(bytes: Buffer, ext: string): Promise<string> {
  const dir = uploadsDir();
  await mkdir(dir, { recursive: true });
  const filename = `${uuidv4()}.${ext}`;
  await writeFile(path.join(dir, filename), bytes);
  scheduleSweep();
  return filename;
}

async function handlePost(request: Request): Promise<NextResponse> {
  const contentType = (request.headers.get("content-type") || "").split(";")[0].trim();

  // The customer-facing uploader (MockupEditor) posts the file as a raw binary body — no
  // FormData/multipart, no filename, no boundary. Restricted in-app browsers (Instagram, Facebook,
  // TikTok on iOS — all WKWebView) have well-documented bugs building multipart/form-data
  // requests, and a raw body sidesteps that whole code path. The admin panel's own uploaders still
  // send multipart/form-data, which is handled the same way as before.
  if (contentType !== "multipart/form-data") {
    const ext = ALLOWED_TYPES[contentType];
    if (!ext) {
      return NextResponse.json({ error: "Formato no soportado. Usa PNG, JPG, WEBP o SVG." }, { status: 400 });
    }

    const bytes = Buffer.from(await request.arrayBuffer());
    if (bytes.byteLength === 0) {
      return NextResponse.json({ error: "El archivo llegó vacío. Intenta de nuevo." }, { status: 400 });
    }
    if (bytes.byteLength > MAX_BYTES) {
      return NextResponse.json({ error: "El archivo supera los 30MB." }, { status: 400 });
    }

    const filename = await saveBytes(bytes, ext);
    return NextResponse.json({ url: `/uploads/${filename}` });
  }

  const formData = await request.formData();
  const file = formData.get("file");

  if (!(file instanceof File)) {
    return NextResponse.json({ error: "No se recibió un archivo." }, { status: 400 });
  }

  const ext = ALLOWED_TYPES[file.type];
  if (!ext) {
    return NextResponse.json(
      { error: "Formato no soportado. Usa PNG, JPG, WEBP o SVG." },
      { status: 400 },
    );
  }

  if (file.size > MAX_BYTES) {
    return NextResponse.json({ error: "El archivo supera los 30MB." }, { status: 400 });
  }

  const bytes = Buffer.from(await file.arrayBuffer());
  const filename = await saveBytes(bytes, ext);
  return NextResponse.json({ url: `/uploads/${filename}` });
}

export async function POST(request: Request) {
  try {
    return await handlePost(request);
  } catch (e) {
    // Next.js masks an uncaught exception here behind a bare, bodyless 500 in production — the
    // customer then sees a dead end with zero information, and so do we. Reading the request body
    // (arrayBuffer()/formData()) is the one step here that can genuinely fail mid-stream — a phone
    // losing signal, or an in-app browser's own network layer cutting the upload short — so this
    // always answers with a real, readable reason instead of ever going silent.
    const msg = e instanceof Error ? e.message : String(e);
    console.error("upload failed:", msg);
    const looksLikeConnectionDrop = /aborted|network|socket|ECONNRESET|premature close|terminated/i.test(msg);
    return NextResponse.json(
      {
        error: looksLikeConnectionDrop
          ? "La conexión se interrumpió mientras subíamos tu foto. Intenta de nuevo con mejor señal o wifi."
          : `No se pudo subir el archivo (error del servidor: ${msg.slice(0, 120)}).`,
      },
      { status: 500 },
    );
  }
}
