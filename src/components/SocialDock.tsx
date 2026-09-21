"use client";

import { usePathname } from "next/navigation";
import { SocialButton, useSocials } from "./SocialLinks";

// Floating column of social buttons (Instagram, Facebook, WhatsApp) — replaces
// the old single WhatsApp button.
export default function SocialDock() {
  const pathname = usePathname();
  const socials = useSocials();
  if (pathname?.startsWith("/admin") || socials.length === 0) return null;
  const onProduct = pathname?.startsWith("/productos/");

  return (
    <nav
      aria-label="Redes sociales"
      className={`fixed right-4 z-30 flex flex-col items-center gap-2.5 sm:right-5 ${onProduct ? "bottom-24 lg:bottom-5" : "bottom-5"}`}
    >
      {socials.map((s) => (
        <SocialButton key={s.kind} social={s} className={s.kind === "whatsapp" ? "pope-social-main" : ""} />
      ))}
    </nav>
  );
}
