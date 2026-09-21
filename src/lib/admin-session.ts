import { cookies } from "next/headers";
import { prisma } from "@/lib/prisma";
import {
  ADMIN_COOKIE_NAME,
  ADMIN_USER_COOKIE,
  ALL_SECTION_KEYS,
  adminAuthToken,
  verifyUserToken,
  type SectionKey,
} from "@/lib/admin-auth";

export type AdminAccess =
  | { kind: "owner"; name: string; perms: SectionKey[] }
  | { kind: "user"; id: string; name: string; role: "PARTNER" | "EMPLOYEE"; perms: SectionKey[] };

export function parsePermissions(csv: string): SectionKey[] {
  return csv.split(",").filter((k): k is SectionKey => (ALL_SECTION_KEYS as string[]).includes(k));
}

export function permsFor(role: string, permissionsCsv: string): SectionKey[] {
  return role === "PARTNER" ? ALL_SECTION_KEYS : parsePermissions(permissionsCsv);
}

// Reads the logged-in admin from cookies. Team members are re-checked against
// the database so deactivating someone or changing their permissions takes
// effect on the next page load, not only when their token expires.
export async function getAdminAccess(): Promise<AdminAccess | null> {
  const store = await cookies();

  const owner = store.get(ADMIN_COOKIE_NAME)?.value;
  if (owner && owner === (await adminAuthToken())) {
    return { kind: "owner", name: "Dueña", perms: ALL_SECTION_KEYS };
  }

  const token = await verifyUserToken(store.get(ADMIN_USER_COOKIE)?.value);
  if (!token) return null;
  const user = await prisma.adminUser.findUnique({ where: { id: token.id } });
  if (!user || !user.active) return null;
  return {
    kind: "user",
    id: user.id,
    name: user.name,
    role: user.role === "PARTNER" ? "PARTNER" : "EMPLOYEE",
    perms: permsFor(user.role, user.permissions),
  };
}
