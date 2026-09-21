import type { Metadata } from "next";
import { cookies } from "next/headers";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import WhatsAppButton from "@/components/WhatsAppButton";
import MetaPixel from "@/components/MetaPixel";
import VisitTracker from "@/components/VisitTracker";
import { EditModeProvider } from "@/components/edit/EditModeContext";
import EditModeToggle from "@/components/edit/EditModeToggle";
import { ADMIN_COOKIE_NAME, adminAuthToken } from "@/lib/admin-auth";
import { prisma } from "@/lib/prisma";
import { DEFAULT_ACCENT_COLOR, siteText } from "@/lib/site-content";
import "./globals.css";

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
  const isAdmin = cookieStore.get(ADMIN_COOKIE_NAME)?.value === (await adminAuthToken());
  const accentColor = settings?.accentColor || DEFAULT_ACCENT_COLOR;
  const textMap = Object.fromEntries(siteTextRows.map((t) => [t.key, t.value]));
  const footerTagline = siteText(textMap, "footer.tagline");

  return (
    <html lang="es" style={{ ["--neon" as string]: accentColor }}>
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
