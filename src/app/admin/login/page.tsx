"use client";

import { Suspense, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";

function AdminLoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");

    const res = await fetch("/api/admin/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password }),
    });

    setLoading(false);

    if (!res.ok) {
      setError("Correo o contraseña incorrectos.");
      return;
    }

    router.push(searchParams.get("next") || "/admin");
    router.refresh();
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="relative w-full max-w-sm overflow-hidden rounded-2xl border border-neutral-200 bg-white p-8 shadow-xl"
    >
      <div className="absolute inset-x-0 top-0 h-1.5 bg-neon" />
      <p className="text-4xl font-black uppercase tracking-tight text-white">POPE</p>
      <p className="mb-8 mt-1 text-xs font-bold uppercase tracking-[0.2em] text-neon">Panel de administración</p>
      <label className="mb-1 block text-xs font-bold uppercase tracking-wide text-neutral-600">Correo</label>
      <input
        type="email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        placeholder="(la dueña lo deja vacío)"
        autoFocus
        className="mb-4 w-full rounded-lg border border-neutral-300 px-3 py-2.5 outline-none focus:border-neutral-900"
      />
      <label className="mb-1 block text-xs font-bold uppercase tracking-wide text-neutral-600">Contraseña</label>
      <input
        type="password"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        className="mb-4 w-full rounded-lg border border-neutral-300 px-3 py-2.5 outline-none focus:border-neutral-900"
      />
      {error && <p className="mb-4 text-sm text-red-600">{error}</p>}
      <button
        type="submit"
        disabled={loading}
        className="w-full rounded-full bg-neutral-900 px-4 py-3 text-sm font-extrabold uppercase tracking-wide text-white disabled:opacity-50"
      >
        {loading ? "Entrando..." : "Entrar"}
      </button>
    </form>
  );
}

export default function AdminLoginPage() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-neutral-100 p-6">
      <Suspense fallback={null}>
        <AdminLoginForm />
      </Suspense>
    </main>
  );
}
