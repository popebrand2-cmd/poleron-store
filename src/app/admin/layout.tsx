import type { Metadata } from "next";
import PushToggle from "@/components/admin/PushToggle";

// Installable on the phone (Home Screen): needed for the sale notifications on iPhone.
export const metadata: Metadata = {
  manifest: "/admin-manifest.webmanifest",
  appleWebApp: { capable: true, title: "POPE Admin", statusBarStyle: "black-translucent" },
  icons: { apple: "/brand/admin-180.png" },
};

// The admin back-office wears the same black + neon POPE look as the
// storefront; the remapping of its light utility classes lives in
// globals.css under .admin-dark.
export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="admin-dark min-h-screen">
      <div className="h-1 bg-neon" />
      <PushToggle />
      {children}
    </div>
  );
}
