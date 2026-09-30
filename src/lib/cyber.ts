// Shared by PopeHero (the dimmed photo behind the hero) and CyberGate (the full-screen intro) so both
// turn on/off from the exact same rule — no way for one to show the campaign while the other doesn't.
export type CyberProduct = { id: string; slug: string; name: string; basePrice: number; compareAtPrice: number | null };

// The Cyber date the owner asked to match (see scripts/cyber-sale.js). Bump this — or just ask me to
// — if the campaign gets extended; the campaign otherwise hides itself the moment every product's
// compareAtPrice is cleared in Admin > Productos, so ending the sale never depends on remembering to
// touch this file.
export const CYBER_ENDS_AT = new Date("2026-10-08T02:59:59-03:00"); // end of Oct 7, Chile time

export function getCyberSaleItems(products: CyberProduct[]): CyberProduct[] {
  return products.filter((p) => p.compareAtPrice != null && p.compareAtPrice > p.basePrice);
}

export function isCyberActive(products: CyberProduct[]): boolean {
  return getCyberSaleItems(products).length > 0 && Date.now() <= CYBER_ENDS_AT.getTime();
}
