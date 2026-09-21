// Meta Pixel events for the purchase funnel. Only real moments are reported and the
// Pixel itself only exists when NEXT_PUBLIC_META_PIXEL_ID is configured (see MetaPixel).
//
//   ViewContent       -> a product page is opened
//   CustomizeProduct  -> the customer adds a design for the first time on that page
//   AddToCart         -> the design is placed and the item goes into the cart
//                        (this is also the "design completed" moment — there is no separate step)
//   InitiateCheckout  -> the checkout page is opened with items in the cart
//   Purchase          -> confirmed order (MetaPixel.trackPurchase, once per order)

type Fbq = (command: string, event: string, params?: Record<string, unknown>, options?: Record<string, unknown>) => void;

const PIXEL_ID = process.env.NEXT_PUBLIC_META_PIXEL_ID;

function fbq(): Fbq | null {
  if (typeof window === "undefined") return null;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const fn = (window as any).fbq;
  return typeof fn === "function" ? (fn as Fbq) : null;
}

// The Pixel script loads after the page becomes interactive, so an event fired on mount may
// arrive a moment before it exists: retry briefly instead of losing it.
export function trackEvent(event: string, params?: Record<string, unknown>, options?: Record<string, unknown>) {
  if (!PIXEL_ID) return;
  let tries = 0;
  const attempt = () => {
    const f = fbq();
    if (f) {
      f("track", event, params, options);
      return;
    }
    if (++tries < 20) setTimeout(attempt, 300);
  };
  attempt();
}

// Runs `fn` at most once per browser tab session for a given key (e.g. one InitiateCheckout per cart).
export function once(key: string, fn: () => void) {
  try {
    if (sessionStorage.getItem(`pope-ev:${key}`)) return;
    sessionStorage.setItem(`pope-ev:${key}`, "1");
  } catch {
    // storage unavailable: callers also guard with refs, so it is still at most once per page load
  }
  fn();
}
