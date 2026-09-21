"use client";

import { usePathname } from "next/navigation";
import { SocialButton, useSocials } from "./SocialLinks";

// Floating column of social buttons (Instagram, Facebook, WhatsApp) — replaces
// the old single WhatsApp button.
export default function SocialDock() {
  const pathname = usePathname();
  const socials = useSocials();
  if (pathname?.startsWith("/admin") || socials.length === 0) return null;

  return (
    <nav aria-label="Redes sociales" className="fixed bottom-5 right-5 z-30 flex flex-col items-center gap-2.5">
      {socials.map((s) => (
        <SocialButton key={s.kind} social={s} className={s.kind === "whatsapp" ? "pope-social-main" : ""} />
      ))}
    </nav>
  );
}
