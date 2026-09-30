import Link from "next/link";

// The owner's own designed Cyber banner (logo, badge, headline and CTA already baked into the
// image) — placed as-is, full width, above the interactive hero. Scales by width so nothing in it
// is ever cropped; it disappears together with the rest of the Cyber campaign (see CyberBanner.tsx)
// once the owner removes public/promo/cyber-banner.webp or asks to take it down.
export default function CyberImageBanner({ href }: { href: string }) {
  return (
    <Link href={href} className="block bg-black" aria-label="Cyber POPE: personaliza tu polera o polerón">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src="/promo/cyber-banner.webp"
        alt="Cyber POPE — Tu idea. Tu prenda. Personaliza tu polera o polerón."
        className="block h-auto w-full"
        width={2000}
        height={667}
        fetchPriority="high"
      />
    </Link>
  );
}
