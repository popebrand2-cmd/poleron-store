"use client";

import { useSiteImage } from "@/components/SiteContentProvider";

// The POPE signature behind the garment, next to the hood.
export default function HeroSignature() {
  const src = useSiteImage("image.signature");
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={src}
      alt=""
      aria-hidden="true"
      draggable={false}
      className="pointer-events-none absolute right-0 top-[9%] z-0 w-[44%] max-w-none opacity-[0.5] [filter:drop-shadow(0_0_18px_rgba(182,255,0,0.5))]"
    />
  );
}
