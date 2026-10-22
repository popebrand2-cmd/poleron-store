import { NextResponse } from "next/server";
import { loadLimitedCards } from "@/lib/limited";

export const dynamic = "force-dynamic";

// Public: the exclusive pieces for the floating "Exclusive" button — the ones still on sale; when none is, the sold-out or
// closed ones (the button stays up and says "Agotada": scarcity sells the next drop).
export async function GET() {
  const cards = await loadLimitedCards();
  const open = cards.filter((c) => !c.soldOut && !c.closed);
  const items = open.length > 0 ? open : cards;
  return NextResponse.json({ items }, { headers: { "Cache-Control": "public, max-age=60" } });
}
