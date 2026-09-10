import path from "path";

// In production this points at the mounted persistent volume (e.g.
// /app/data/uploads on Railway); locally it defaults to a folder at the
// project root so it survives `next build` without touching /public.
export function uploadsDir(): string {
  return process.env.UPLOADS_DIR || path.join(process.cwd(), "uploads");
}
