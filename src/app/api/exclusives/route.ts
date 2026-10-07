import { NextResponse } from "next/server";
import { loadLimitedCards } from "@/lib/limited";

export const dynamic = "force-dynamic";

// Public: the exclusive pieces still on sale, for the hidden "Exclusive" button (sold-out or closed ones are left out).
export async function GET() {
  const items = (await loadLimitedCards()).filter((c) => !c.soldOut && !c.closed);
  return NextResponse.json({ items }, { headers: { "Cache-Control": "public, max-age=60" } });
}
