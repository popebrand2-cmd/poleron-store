"use client";

import { usePathname } from "next/navigation";
import { useSiteText } from "./SiteContentProvider";

export default function WhatsAppButton() {
  const pathname = usePathname();
  const number = useSiteText("setting.whatsappNumber").replace(/D/g, "");
  const message = useSiteText("setting.whatsappMessage");
  if (pathname?.startsWith("/admin")) return null;

  const href = `https://wa.me/${number}?text=${encodeURIComponent(message)}`;

  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      aria-label="Escríbenos por WhatsApp"
      className="fixed bottom-5 right-5 z-30 flex h-14 w-14 items-center justify-center rounded-full glass-wa text-white transition hover:scale-105 hover:brightness-110"
    >
      <svg viewBox="0 0 24 24" fill="currentColor" className="h-7 w-7">
        <path d="M17.47 14.38c-.29-.14-1.7-.84-1.96-.93-.26-.1-.46-.14-.65.14-.19.29-.75.93-.92 1.12-.17.19-.34.21-.63.07-.29-.14-1.23-.45-2.35-1.45-.87-.77-1.45-1.73-1.63-2.02-.17-.29-.02-.45.13-.6.13-.13.29-.34.43-.5.14-.17.19-.29.29-.48.1-.19.05-.36-.02-.5-.07-.14-.65-1.57-.9-2.15-.24-.57-.48-.5-.65-.5-.17-.01-.36-.01-.55-.01-.19 0-.5.07-.76.36-.26.29-1 .98-1 2.38 0 1.4 1.02 2.76 1.16 2.95.14.19 2 3.05 4.84 4.28.68.29 1.21.47 1.62.6.68.22 1.3.19 1.79.11.55-.08 1.7-.69 1.94-1.36.24-.67.24-1.24.17-1.36-.07-.12-.26-.19-.55-.33z" />
        <path d="M12.04 2C6.58 2 2.13 6.45 2.13 11.91c0 1.87.51 3.63 1.4 5.14L2 22l5.09-1.5a9.85 9.85 0 0 0 4.95 1.33h.01c5.46 0 9.91-4.45 9.91-9.91C21.96 6.45 17.5 2 12.04 2zm0 18.15h-.01c-1.58 0-3.13-.42-4.48-1.22l-.32-.19-3.02.89.81-2.94-.21-.3a8.2 8.2 0 0 1-1.26-4.48c0-4.53 3.69-8.22 8.5-8.22 2.27 0 4.4.88 6 2.48a8.42 8.42 0 0 1 2.48 5.98c0 4.53-3.69 8-8.49 8z" />
      </svg>
    </a>
  );
}
