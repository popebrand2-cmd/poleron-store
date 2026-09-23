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

// ---------------------------------------------------------------------------
// Team accounts (socia / empleados). The owner keeps logging in with the
// ADMIN_PASSWORD cookie above (full access). Everyone else gets a signed,
// expiring token that carries their allowed sections, so the Edge middleware
// can enforce access per path without touching the database.
// ---------------------------------------------------------------------------

export const ADMIN_USER_COOKIE = "admin_user";
export const USER_SESSION_SECONDS = 60 * 60 * 12;
// "Mantener sesión iniciada" on the login form
export const REMEMBER_SESSION_SECONDS = 60 * 60 * 24 * 30;

export const SECTIONS = [
  { key: "pedidos", label: "Pedidos", href: "/admin/pedidos" },
  { key: "productos", label: "Productos", href: "/admin" },
  { key: "envios", label: "Envíos", href: "/admin/envios" },
  { key: "portada", label: "Portada y edición de la página", href: "/admin/portada" },
  { key: "colecciones", label: "Colecciones", href: "/admin/colecciones" },
  { key: "estadisticas", label: "Estadísticas y ventas", href: "/admin/estadisticas" },
] as const;

export type SectionKey = (typeof SECTIONS)[number]["key"];
export const ALL_SECTION_KEYS: SectionKey[] = SECTIONS.map((s) => s.key);

export type UserSession = { id: string; name: string; role: "PARTNER" | "EMPLOYEE"; perms: SectionKey[]; exp: number };

// Which section a request path belongs to. "owner" = only the owner, null = no restriction.
export function sectionForPath(pathname: string): SectionKey | "owner" | null {
  const p = pathname;
  if (p.startsWith("/admin/usuarios") || p.startsWith("/api/admin/users")) return "owner";
  if (p.startsWith("/admin/almacenamiento") || p.startsWith("/api/admin/storage")) return "owner";
  if (p.startsWith("/admin/pedidos") || p.startsWith("/api/admin/orders")) return "pedidos";
  if (p.startsWith("/admin/envios") || p.startsWith("/api/admin/shipping")) return "envios";
  if (p.startsWith("/admin/portada") || p.startsWith("/api/admin/hero") || p.startsWith("/api/admin/site-text") || p.startsWith("/api/admin/upload-video") || p.startsWith("/api/admin/content-items")) return "portada";
  if (p.startsWith("/admin/colecciones") || p.startsWith("/api/admin/collections") || p.startsWith("/api/admin/designs")) return "colecciones";
  if (p.startsWith("/admin/estadisticas")) return "estadisticas";
  if (p === "/admin" || p.startsWith("/admin/productos") || p.startsWith("/api/admin/products")) return "productos";
  return null;
}

async function hmacHex(payload: string): Promise<string> {
  const secret = `poleron-session:${process.env.ADMIN_PASSWORD ?? ""}`;
  const key = await crypto.subtle.importKey("raw", new TextEncoder().encode(secret), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  const sig = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(payload));
  return Array.from(new Uint8Array(sig)).map((b) => b.toString(16).padStart(2, "0")).join("");
}

function toB64Url(s: string): string {
  return btoa(unescape(encodeURIComponent(s))).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}
function fromB64Url(s: string): string {
  const b64 = s.replace(/-/g, "+").replace(/_/g, "/");
  return decodeURIComponent(escape(atob(b64)));
}

export async function signUserToken(s: Omit<UserSession, "exp">, seconds = USER_SESSION_SECONDS): Promise<string> {
  const session: UserSession = { ...s, exp: Math.floor(Date.now() / 1000) + seconds };
  const payload = toB64Url(JSON.stringify(session));
  return `${payload}.${await hmacHex(payload)}`;
}

export async function verifyUserToken(token: string | undefined): Promise<UserSession | null> {
  if (!token) return null;
  const [payload, sig] = token.split(".");
  if (!payload || !sig) return null;
  if ((await hmacHex(payload)) !== sig) return null;
  try {
    const session = JSON.parse(fromB64Url(payload)) as UserSession;
    if (!session.exp || session.exp < Date.now() / 1000) return null;
    return session;
  } catch {
    return null;
  }
}

export function canAccess(perms: SectionKey[], section: SectionKey): boolean {
  return perms.includes(section);
}

export function firstAllowedPath(perms: SectionKey[]): string {
  const s = SECTIONS.find((x) => perms.includes(x.key));
  return s ? s.href : "/admin/login";
}
