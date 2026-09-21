"use client";

import { usePathname } from "next/navigation";
import EditableLink from "./edit/EditableLink";
import Txt from "./edit/Txt";
import { useSiteImage } from "./SiteContentProvider";

export default function Footer() {
  const pathname = usePathname();
  const logo = useSiteImage("image.logo");
  if (pathname?.startsWith("/admin")) return null;

  return (
    <footer className="border-t border-neutral-800 bg-black">
      <div className="mx-auto max-w-6xl px-6 py-10">
        <div className="flex flex-col items-start justify-between gap-6 sm:flex-row sm:items-center">
          <div>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={logo} alt="POPE Brand" className="h-16 w-auto" />
            <Txt k="footer.script" as="p" className="mt-3 font-script text-2xl text-neon" />
            <Txt k="footer.motto" as="p" className="mt-1 text-[11px] font-bold uppercase tracking-[0.3em] text-neutral-500" />
            <p className="mt-1 max-w-sm text-xs text-neutral-500">
              <Txt k="footer.tagline" multiline />
            </p>
          </div>
          <div className="flex gap-6 text-xs font-medium uppercase tracking-wide text-neutral-400">
            <EditableLink href="/" className="hover:text-white">
              <Txt k="nav.home" />
            </EditableLink>
            <EditableLink href="/#tienda" className="hover:text-white">
              <Txt k="nav.shop" />
            </EditableLink>
            <EditableLink href="/carrito" className="hover:text-white">
              <Txt k="footer.cart" />
            </EditableLink>
          </div>
        </div>
        <p className="mt-8 text-xs text-neutral-600">
          © {new Date().getFullYear()} <Txt k="footer.copyright" />
        </p>
      </div>
    </footer>
  );
}
