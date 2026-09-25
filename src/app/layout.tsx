import type { Metadata } from "next";
import { Inter, Teko, Yellowtail } from "next/font/google";
import { cookies } from "next/headers";
import Header from "@/components/Header";
import InAppBrowserNotice from "@/components/InAppBrowserNotice";
import Footer from "@/components/Footer";
import SocialDock from "@/components/SocialDock";
import OfferPopup from "@/components/OfferPopup";
import MetaPixel from "@/components/MetaPixel";
import VisitTracker from "@/components/VisitTracker";
import { EditModeProvider } from "@/components/edit/EditModeContext";
import EditModeToggle from "@/components/edit/EditModeToggle";
import { getAdminAccess } from "@/lib/admin-session";
import { prisma } from "@/lib/prisma";
import { DEFAULT_ACCENT_COLOR, SITE_IMAGE_DEFAULTS, SITE_TEXT_DEFAULTS } from "@/lib/site-content";
import { SiteContentProvider } from "@/components/SiteContentProvider";
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
  const texts = { ...SITE_TEXT_DEFAULTS, ...textMap };
  const images = Object.fromEntries(
    Object.entries(SITE_IMAGE_DEFAULTS).map(([k, def]) => [k, textMap[k] || def]),
  );

  return (
    <html lang="es" suppressHydrationWarning className={`${inter.variable} ${teko.variable} ${yellowtail.variable}`} style={{ ["--neon" as string]: accentColor }}>
      <head>
        {/* Light mode for low-power phones (few cores / little memory / data saver / slow network), or ?lite=1:
            CSS under [data-lite] switches off the costly effects. ?lite=0 turns it off again. */}
        <script
          dangerouslySetInnerHTML={{
            __html: `(function(){try{var n=navigator,c=n.connection||{},q=location.search.match(/[?&]lite=([01])/),k="pope-lite",v=q?q[1]==="1":null;if(v===null){var st=localStorage.getItem(k);v=st===null?null:st==="1"}else{localStorage.setItem(k,v?"1":"0")}if(v===null)v=(n.deviceMemory&&n.deviceMemory<=2)||(n.hardwareConcurrency&&n.hardwareConcurrency<=4)||c.saveData===true||/(^|-)(slow-2g|2g|3g)$/.test(c.effectiveType||"");if(v)document.documentElement.setAttribute("data-lite","")}catch(e){}})()`,
          }}
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
        <SiteContentProvider texts={texts} images={images}>
        <EditModeProvider isAdmin={isAdmin}>
          <InAppBrowserNotice />
          <Header />
          <div className="flex-1">{children}</div>
          <Footer />
          <SocialDock />
          <OfferPopup />
          <EditModeToggle initialAccentColor={accentColor} />
        </EditModeProvider>
        </SiteContentProvider>
        <MetaPixel />
        <VisitTracker />
      </body>
    </html>
  );
}
