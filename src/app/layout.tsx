import type { Metadata } from "next";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import "./globals.css";

export const metadata: Metadata = {
  title: "Poleron Store — Ropa personalizada",
  description: "Diseña tu propio poleron: sube tu arte y míralo en un mockup real antes de comprar.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es">
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
        <Header />
        <div className="flex-1">{children}</div>
        <Footer />
      </body>
    </html>
  );
}
