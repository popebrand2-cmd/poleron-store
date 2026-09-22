// Instagram/Facebook/TikTok/Line open links inside their own embedded browser (WKWebView on
// iOS), which routinely BLOCKS <input type="file"> from opening the native photo picker at all —
// tapping "Subir tu diseño" does nothing. This isn't fixable from our code; the only real fix is
// for the visitor to open the page in Safari or Chrome instead. Detect it so we can say so.
export type InAppApp = "Instagram" | "Facebook" | "TikTok" | "Line";

export function detectInAppBrowser(ua: string): InAppApp | null {
  if (/Instagram/i.test(ua)) return "Instagram";
  if (/FBAN|FBAV|FB_IAB/i.test(ua)) return "Facebook";
  if (/TikTok|musical_ly|BytedanceWebview/i.test(ua)) return "TikTok";
  if (/\bLine\//i.test(ua)) return "Line";
  return null;
}
