import { mkdir, writeFile } from "fs/promises";
import path from "path";
import { NextResponse } from "next/server";
import { v4 as uuidv4 } from "uuid";
import { uploadsDir } from "@/lib/storage";

const ALLOWED_TYPES: Record<string, string> = {
  "image/png": "png",
  "image/jpeg": "jpg",
  "image/webp": "webp",
  "image/svg+xml": "svg",
};

// Modern phone cameras (even after iOS converts HEIC to JPEG on the way out of the picker)
// routinely produce 15-25MB photos, so 15MB was rejecting ordinary customer uploads.
const MAX_BYTES = 30 * 1024 * 1024; // 30MB

export async function POST(request: Request) {
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

  const dir = uploadsDir();
  await mkdir(dir, { recursive: true });

  const filename = `${uuidv4()}.${ext}`;
  const bytes = Buffer.from(await file.arrayBuffer());
  await writeFile(path.join(dir, filename), bytes);

  return NextResponse.json({ url: `/uploads/${filename}` });
}
