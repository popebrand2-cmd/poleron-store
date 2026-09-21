"use client";

import { Suspense, useState } from "react";
import { useSearchParams } from "next/navigation";

function AdminLoginForm() {
  const searchParams = useSearchParams();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [remember, setRemember] = useState(true);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");

    const res = await fetch("/api/admin/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password, remember }),
    });

    setLoading(false);

    if (!res.ok) {
      setError("Correo o contraseña incorrectos.");
      return;
    }

    // A full page load (not a client-side transition) lets the browser see the login succeeded and
    // offer to save the password.
    const next = searchParams.get("next");
    window.location.assign(next && next.startsWith("/") && !next.startsWith("//") ? next : "/admin");
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="relative w-full max-w-sm overflow-hidden rounded-2xl border border-neutral-200 bg-white p-8 shadow-xl"
    >
      <div className="absolute inset-x-0 top-0 h-1.5 bg-neon" />
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src="/brand/pope-logo.png" alt="POPE Brand" className="h-20 w-auto" />
      <p className="mb-8 mt-1 text-xs font-bold uppercase tracking-[0.2em] text-neon">Panel de administración</p>
      <label htmlFor="admin-email" className="mb-1 block text-xs font-bold uppercase tracking-wide text-neutral-600">Correo</label>
      <input
        id="admin-email"
        name="email"
        autoComplete="username"
        inputMode="email"
        type="email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        placeholder="(la dueña lo deja vacío)"
        autoFocus
        className="mb-4 w-full rounded-lg border border-neutral-300 px-3 py-2.5 outline-none focus:border-neutral-900"
      />
      <label htmlFor="admin-password" className="mb-1 block text-xs font-bold uppercase tracking-wide text-neutral-600">Contraseña</label>
      <div className="relative mb-4">
        <input
          id="admin-password"
          name="password"
          autoComplete="current-password"
          type={showPassword ? "text" : "password"}
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="w-full rounded-lg border border-neutral-300 py-2.5 pl-3 pr-20 outline-none focus:border-neutral-900"
        />
        <button
          type="button"
          onClick={() => setShowPassword((v) => !v)}
          className="absolute inset-y-0 right-3 text-xs font-bold uppercase tracking-wide text-neutral-500 hover:text-neon"
        >
          {showPassword ? "Ocultar" : "Mostrar"}
        </button>
      </div>
      <label className="mb-4 flex cursor-pointer items-center gap-2 text-sm text-neutral-600">
        <input type="checkbox" checked={remember} onChange={(e) => setRemember(e.target.checked)} className="h-4 w-4 accent-[var(--neon)]" />
        Mantener sesión iniciada por 30 días en este dispositivo
      </label>
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
