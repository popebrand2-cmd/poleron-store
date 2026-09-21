"use client";

import { useEditMode } from "@/components/edit/EditModeContext";
import { useSiteText } from "@/components/SiteContentProvider";

export type SocialKind = "instagram" | "facebook" | "whatsapp";

const ICONS: Record<SocialKind, React.ReactNode> = {
  instagram: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.9} strokeLinecap="round" strokeLinejoin="round" className="h-6 w-6" aria-hidden="true">
      <rect x="3.5" y="3.5" width="17" height="17" rx="5" />
      <circle cx="12" cy="12" r="4" />
      <circle cx="17.3" cy="6.7" r="0.6" fill="currentColor" />
    </svg>
  ),
  facebook: (
    <svg viewBox="0 0 24 24" fill="currentColor" className="h-6 w-6" aria-hidden="true">
      <path d="M13.5 21v-7.8h2.6l.4-3.1h-3V8.2c0-.9.3-1.5 1.6-1.5h1.6V3.9c-.3 0-1.2-.1-2.3-.1-2.3 0-3.9 1.4-3.9 4v2.3H8v3.1h2.5V21h3z" />
    </svg>
  ),
  whatsapp: (
    <svg viewBox="0 0 24 24" fill="currentColor" className="h-6 w-6" aria-hidden="true">
      <path d="M17.47 14.38c-.29-.14-1.7-.84-1.96-.93-.26-.1-.46-.14-.65.14-.19.29-.75.93-.92 1.12-.17.19-.34.21-.63.07-.29-.14-1.23-.45-2.35-1.45-.87-.77-1.45-1.73-1.63-2.02-.17-.29-.02-.45.13-.6.13-.13.29-.34.43-.5.14-.17.19-.29.29-.48.1-.19.05-.36-.02-.5-.07-.14-.65-1.57-.9-2.15-.24-.57-.48-.5-.65-.5-.17-.01-.36-.01-.55-.01-.19 0-.5.07-.76.36-.26.29-1 .98-1 2.38 0 1.4 1.02 2.76 1.16 2.95.14.19 2 3.05 4.84 4.28.68.29 1.21.47 1.62.6.68.22 1.3.19 1.79.11.55-.08 1.7-.69 1.94-1.36.24-.67.24-1.24.17-1.36-.07-.12-.26-.19-.55-.33z" />
      <path d="M12.04 2C6.58 2 2.13 6.45 2.13 11.91c0 1.87.51 3.63 1.4 5.14L2 22l5.09-1.5a9.85 9.85 0 0 0 4.95 1.33h.01c5.46 0 9.91-4.45 9.91-9.91C21.96 6.45 17.5 2 12.04 2zm0 18.15h-.01c-1.58 0-3.13-.42-4.48-1.22l-.32-.19-3.02.89.81-2.94-.21-.3a8.2 8.2 0 0 1-1.26-4.48c0-4.53 3.69-8.22 8.5-8.22 2.27 0 4.4.88 6 2.48a8.42 8.42 0 0 1 2.48 5.98c0 4.53-3.69 8-8.49 8z" />
    </svg>
  ),
};

const LABELS: Record<SocialKind, string> = {
  instagram: "Instagram",
  facebook: "Facebook",
  whatsapp: "WhatsApp",
};

function normalize(url: string): string {
  const u = url.trim();
  if (!u) return "";
  return /^https?:\/\//i.test(u) ? u : `https://${u.replace(/^\/+/, "")}`;
}

export type Social = { kind: SocialKind; label: string; href: string; icon: React.ReactNode; missing: boolean };

// The three social links, in display order. A network without a link yet is left
// out for visitors, but shown (dimmed) to the owner while editing so it can be set.
export function useSocials(): Social[] {
  const { editMode } = useEditMode();
  const instagram = normalize(useSiteText("setting.instagramUrl"));
  const facebook = normalize(useSiteText("setting.facebookUrl"));
  const number = useSiteText("setting.whatsappNumber").replace(/\D/g, "");
  const message = useSiteText("setting.whatsappMessage");
  const whatsapp = number ? `https://wa.me/${number}?text=${encodeURIComponent(message)}` : "";

  const all: Social[] = [
    { kind: "instagram", label: LABELS.instagram, href: instagram, icon: ICONS.instagram, missing: !instagram },
    { kind: "facebook", label: LABELS.facebook, href: facebook, icon: ICONS.facebook, missing: !facebook },
    { kind: "whatsapp", label: LABELS.whatsapp, href: whatsapp, icon: ICONS.whatsapp, missing: !whatsapp },
  ];
  return all.filter((s) => !s.missing || editMode);
}

// Round POPE-style button: dark glass with a neon icon that lights up on hover.
export function SocialButton({ social, className = "" }: { social: Social; className?: string }) {
  const { editMode } = useEditMode();
  const base = `pope-social glass-dark ${social.missing ? "opacity-40" : ""} ${className}`;
  if (social.missing) {
    return (
      <span className={base} title={`${social.label}: agrega el enlace en «Imágenes y contacto»`}>
        {social.icon}
      </span>
    );
  }
  return (
    <a
      href={social.href}
      target="_blank"
      rel="noopener noreferrer"
      aria-label={social.kind === "whatsapp" ? "Escríbenos por WhatsApp" : `Síguenos en ${social.label}`}
      onClick={(e) => {
        if (editMode) e.preventDefault();
      }}
      className={base}
    >
      {social.icon}
    </a>
  );
}
