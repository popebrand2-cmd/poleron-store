import type { Metadata } from "next";
import { Inter, Teko, Yellowtail } from "next/font/google";
import { cookies } from "next/headers";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import WhatsAppButton from "@/components/WhatsAppButton";
import MetaPixel from "@/components/MetaPixel";
import VisitTracker from "@/components/VisitTracker";
import { EditModeProvider } from "@/components/edit/EditModeContext";
import EditModeToggle from "@/components/edit/EditModeToggle";
import { getAdminAccess } from "@/lib/admin-session";
import { prisma } from "@/lib/prisma";
import { DEFAULT_ACCENT_COLOR, siteText } from "@/lib/site-content";
import "./globals.css";

// POPE brand typography (guía tipográfica): Inter = texto informativo,
// Teko = títulos de impacto, Yellowtail = acentos y frases de marca.
const inter = Inter({ subsets: ["latin"], variable: "--font-inter", display: "swap" });
const teko = Teko({ subsets: ["latin"], weight: ["400", "500", "600", "700"], variable: "--font-teko", display: "swap" });
const yellowtail = Yellowtail({ subsets: ["latin"], weight: "400", variable: "--font-yellowtail", display: "swap" });

export const metadata: Metadata = {
  title: "POPE — Ropa personalizada",
  description: "Diseña tu propia ropa: sube tu arte y míralo en un mockup real antes de comprar.",
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const [cookieStore, settings, siteTextRows] = await Promise.all([
    cookies(),
    prisma.storeSettings.findUnique({ where: { id: "singleton" } }),
    prisma.siteText.findMany(),
  ]);
  const access = cookieStore.get("admin_auth") || cookieStore.get("admin_user") ? await getAdminAccess() : null;
  const isAdmin = !!access && access.perms.includes("portada");
  const accentColor = settings?.accentColor || DEFAULT_ACCENT_COLOR;
  const textMap = Object.fromEntries(siteTextRows.map((t) => [t.key, t.value]));
  const footerTagline = siteText(textMap, "footer.tagline");

  return (
    <html lang="es" className={`${inter.variable} ${teko.variable} ${yellowtail.variable}`} style={{ ["--neon" as string]: accentColor }}>
      <head>
        {/* Fonts customers can pick for their design text (src/components/MockupEditor.tsx FONT_OPTIONS) */}
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          rel="stylesheet"
          href="https://fonts.googleapis.com/css2?family=Poppins:wght@400;700&family=Montserrat:wght@400;700&family=Oswald:wght@400;700&family=Bebas+Neue&family=Anton&family=Playfair+Display:wght@400;700&family=Pacifico&family=Dancing+Script:wght@700&family=Permanent+Marker&family=Lobster&family=Roboto+Mono:wght@400;700&family=Archivo+Black&display=swap"
        />
      </head>
      <body className="flex min-h-screen flex-col antialiased">
        {/* Liquid "drop" filter used by the .pope-cta buttons */}
        <svg aria-hidden="true" focusable="false" width="0" height="0" className="pointer-events-none absolute">
          <defs>
            <filter id="pope-goo" x="-10%" y="-40%" width="120%" height="180%" colorInterpolationFilters="sRGB">
              <feGaussianBlur in="SourceGraphic" stdDeviation="7" result="blur" />
              <feColorMatrix in="blur" mode="matrix" values="1 0 0 0 0  0 1 0 0 0  0 0 1 0 0  0 0 0 24 -11" />
            </filter>
          </defs>
        </svg>
        <EditModeProvider isAdmin={isAdmin}>
          <Header />
          <div className="flex-1">{children}</div>
          <Footer tagline={footerTagline} />
          <EditModeToggle
            initialAccentColor={accentColor}
            initialHeroAlign={(settings?.heroImageAlign as "left" | "right") || "right"}
            initialHeroPosX={settings?.heroImagePosX ?? 50}
            initialHeroPosY={settings?.heroImagePosY ?? 50}
            initialHeroZoom={settings?.heroImageZoom ?? 1}
          />
        </EditModeProvider>
        <WhatsAppButton />
        <MetaPixel />
        <VisitTracker />
      </body>
    </html>
  );
}
