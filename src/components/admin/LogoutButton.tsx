"use client";

import { useRouter } from "next/navigation";

export default function LogoutButton({ name }: { name: string }) {
  const router = useRouter();

  async function logout() {
    await fetch("/api/admin/logout", { method: "POST" });
    router.push("/admin/login");
    router.refresh();
  }

  return (
    <button type="button" onClick={logout} className="text-xs text-neutral-500 hover:text-red-600">
      Salir ({name})
    </button>
  );
}
