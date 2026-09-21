"use client";

import { createContext, useContext } from "react";
import { SITE_IMAGE_DEFAULTS, SITE_TEXT_DEFAULTS } from "@/lib/site-content";

type Content = { texts: Record<string, string>; images: Record<string, string> };

const Ctx = createContext<Content>({ texts: SITE_TEXT_DEFAULTS, images: SITE_IMAGE_DEFAULTS });

// Editable copy and pictures for the whole storefront, resolved on the server
// (saved value or built-in default) so client components can just read them.
export function SiteContentProvider({ texts, images, children }: Content & { children: React.ReactNode }) {
  return <Ctx.Provider value={{ texts, images }}>{children}</Ctx.Provider>;
}

export function useSiteText(key: string): string {
  const { texts } = useContext(Ctx);
  return texts[key] ?? SITE_TEXT_DEFAULTS[key] ?? "";
}

export function useSiteImage(key: string): string {
  const { images } = useContext(Ctx);
  return images[key] || SITE_IMAGE_DEFAULTS[key] || "";
}
