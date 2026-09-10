export const ADMIN_COOKIE_NAME = "admin_auth";

// Deterministic token derived from the admin password so we never need to
// store sessions: the middleware just recomputes this and compares.
// Uses Web Crypto (not Node's `crypto` module) so it also works in the
// Edge runtime, where middleware executes.
export async function adminAuthToken(): Promise<string> {
  const password = process.env.ADMIN_PASSWORD ?? "";
  const data = new TextEncoder().encode(`poleron-admin:${password}`);
  const digest = await crypto.subtle.digest("SHA-256", data);
  return Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

export function isAdminPasswordCorrect(candidate: string): boolean {
  const expected = process.env.ADMIN_PASSWORD ?? "";
  if (!expected) return false;
  return candidate === expected;
}
