import { createReadStream } from "fs";
import { readFile, stat } from "fs/promises";
import path from "path";
import { Readable } from "stream";
import { NextResponse } from "next/server";
import { uploadsDir } from "@/lib/storage";

const CONTENT_TYPES: Record<string, string> = {
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".webp": "image/webp",
  ".svg": "image/svg+xml",
  ".mp4": "video/mp4",
  ".webm": "video/webm",
  ".mov": "video/quicktime",
};

const VIDEO_EXTS = new Set([".mp4", ".webm", ".mov"]);

export async function GET(request: Request, { params }: { params: Promise<{ filename: string }> }) {
  const { filename } = await params;

  // Reject anything that isn't a bare filename (no path separators) to
  // prevent escaping the uploads directory.
  if (filename.includes("/") || filename.includes("\\") || filename.includes("..")) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const ext = path.extname(filename).toLowerCase();
  const contentType = CONTENT_TYPES[ext];
  if (!contentType) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const filePath = path.join(uploadsDir(), filename);
  const cache = "public, max-age=31536000, immutable";

  // Videos are streamed with HTTP Range support: phones (iOS Safari in particular) refuse to
  // play a video from a server that can't serve byte ranges, and it lets viewers seek.
  if (VIDEO_EXTS.has(ext)) {
    try {
      const { size } = await stat(filePath);
      const range = request.headers.get("range");
      let start = 0;
      let end = size - 1;
      let status = 200;

      if (range) {
        const m = /^bytes=(\d*)-(\d*)$/.exec(range.trim());
        if (!m || (m[1] === "" && m[2] === "")) {
          return new NextResponse(null, { status: 416, headers: { "Content-Range": `bytes */${size}` } });
        }
        if (m[1] === "") {
          // suffix range: the last N bytes
          start = Math.max(0, size - Number(m[2]));
        } else {
          start = Number(m[1]);
          if (m[2] !== "") end = Math.min(size - 1, Number(m[2]));
        }
        if (start > end || start >= size) {
          return new NextResponse(null, { status: 416, headers: { "Content-Range": `bytes */${size}` } });
        }
        status = 206;
      }

      const stream = Readable.toWeb(createReadStream(filePath, { start, end })) as unknown as ReadableStream;
      const headers: Record<string, string> = {
        "Content-Type": contentType,
        "Content-Length": String(end - start + 1),
        "Accept-Ranges": "bytes",
        "Cache-Control": cache,
      };
      if (status === 206) headers["Content-Range"] = `bytes ${start}-${end}/${size}`;
      return new NextResponse(stream, { status, headers });
    } catch {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }
  }

  try {
    const bytes = await readFile(filePath);
    return new NextResponse(new Uint8Array(bytes), {
      headers: {
        "Content-Type": contentType,
        "Cache-Control": cache,
      },
    });
  } catch {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
}
