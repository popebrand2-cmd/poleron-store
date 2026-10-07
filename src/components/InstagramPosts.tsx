"use client";

import { useEditMode } from "@/components/edit/EditModeContext";
import Txt from "@/components/edit/Txt";
import { useSiteImages, useSiteTexts } from "@/components/SiteContentProvider";

export const INSTA_SLOTS = 8;

function safeUrl(raw: string): string {
  const u = raw.trim();
  if (!u) return "";
  if (/^[a-z][a-z0-9+.-]*:/i.test(u) && !/^https?:\/\//i.test(u)) return "";
  return /^https?:\/\//i.test(u) ? u : `https://${u.replace(/^\/+/, "")}`;
}

function InstaGlyph({ className = "h-6 w-6" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.9} strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden="true">
      <rect x="3.5" y="3.5" width="17" height="17" rx="5" />
      <circle cx="12" cy="12" r="4" />
      <circle cx="17.3" cy="6.7" r="0.6" fill="currentColor" />
    </svg>
  );
}

// The owner's Instagram posts: each tile is a picture of a post and opens that post on Instagram (new tab). Instagram offers no
// free way to read a profile, so the owner adds each post here (picture + link, edit mode → «Imágenes y contacto»). Nothing is
// shown to visitors until at least one post has a picture, so the section never displays invented content.
export default function InstagramPosts({ live = [] }: { live?: { id: string; image: string; permalink: string; caption: string }[] }) {
  const { editMode } = useEditMode();
  const texts = useSiteTexts();
  const images = useSiteImages();
  const profile = safeUrl(texts["setting.instagramUrl"] ?? "");
  const handle = (() => {
    const seg = profile.replace(/[?#].*$/, "").replace(/\/+$/, "").split("/").pop() ?? "";
    return seg && !seg.includes(".com") ? `@${seg}` : "";
  })();

  // The account's latest posts, read from Instagram itself, when it is connected; otherwise the ones added by hand.
  const manual = Array.from({ length: INSTA_SLOTS }, (_, i) => {
    const n = i + 1;
    return { n, src: images[`image.insta${n}`] ?? "", url: safeUrl(texts[`insta.${n}.url`] ?? "") || profile, alt: `Publicación ${n} de Instagram` };
  }).filter((p) => p.src);
  const posts =
    live.length > 0
      ? live.map((p, i) => ({ n: i + 1, src: p.image, url: p.permalink, alt: p.caption ? `Instagram: ${p.caption}` : `Publicación ${i + 1} de Instagram` }))
      : manual;

  if (posts.length === 0) {
    if (!editMode) return null;
    return (
      <section className="border-t border-neutral-800 bg-black">
        <div className="mx-auto max-w-6xl px-6 py-10 text-center">
          <p className="text-sm text-neutral-400">
            Aquí aparecerán tus publicaciones de Instagram. Sube la foto de cada una y pega su enlace en «Imágenes y contacto» → Publicaciones de
            Instagram (hasta {INSTA_SLOTS}). Mientras no subas ninguna, esta sección no se muestra a los visitantes.
          </p>
        </div>
      </section>
    );
  }

  return (
    <section id="instagram" className="border-t border-neutral-800 bg-black">
      <div className="mx-auto max-w-6xl px-6 py-16">
        <div data-reveal="" className="mb-10 text-center">
          <Txt k="insta.eyebrow" as="p" className="mb-1 block font-script text-3xl text-neon" />
          <Txt k="insta.heading" as="h2" className="block text-4xl font-bold uppercase text-white sm:text-5xl" />
          {handle && <p className="mt-2 font-display text-2xl tracking-wide text-neutral-300">{handle}</p>}
          <Txt k="insta.subtext" as="p" multiline className="mx-auto mt-2 block max-w-xl text-neutral-400" />
        </div>

        <ul className="flex flex-wrap justify-center gap-3 sm:gap-4">
          {posts.map((p, i) => (
            <li key={p.n} className="w-[calc(50%-0.375rem)] sm:w-[calc(50%-0.5rem)] md:w-[calc(25%-0.75rem)]" data-reveal="" style={{ ["--reveal-delay" as string]: `${(i % 4) * 90}ms` }}>
              <a
                href={p.url || undefined}
                target="_blank"
                rel="noopener noreferrer"
                aria-label={`Ver la publicación ${p.n} en Instagram`}
                onClick={(e) => editMode && e.preventDefault()}
                className="group relative block aspect-square overflow-hidden rounded-2xl border border-white/10 bg-neutral-900"
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={p.src}
                  alt={p.alt}
                  loading="lazy"
                  decoding="async"
                  referrerPolicy="no-referrer"
                  draggable={false}
                  className="h-full w-full object-cover transition duration-700 ease-[cubic-bezier(0.32,0.72,0,1)] group-hover:scale-[1.07]"
                />
                <span className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-black/20 opacity-70 transition-opacity duration-300 group-hover:opacity-100" />
                <span className="pointer-events-none absolute right-3 top-3 grid h-9 w-9 place-items-center rounded-full bg-black/55 text-white backdrop-blur-sm transition group-hover:bg-neon group-hover:text-black">
                  <InstaGlyph className="h-5 w-5" />
                </span>
                <span className="pointer-events-none absolute inset-x-0 bottom-3 flex justify-center opacity-0 transition duration-300 group-hover:opacity-100 [@media(hover:none)]:opacity-100">
                  <span className="rounded-full bg-neon px-4 py-1.5 text-xs font-bold uppercase tracking-wide text-black shadow-[0_6px_18px_rgba(0,0,0,0.45)]">Ver en Instagram</span>
                </span>
              </a>
            </li>
          ))}
        </ul>

        {profile && (
          <div data-reveal="" className="mt-10 text-center">
            <a
              href={profile}
              target="_blank"
              rel="noopener noreferrer"
              onClick={(e) => editMode && e.preventDefault()}
              className="inline-flex min-h-12 items-center gap-3 rounded-full border-2 border-neon px-7 text-sm font-bold uppercase tracking-[0.16em] text-neon transition hover:bg-neon hover:text-black"
            >
              <InstaGlyph className="h-5 w-5" />
              <Txt k="insta.cta" />
            </a>
          </div>
        )}
      </div>
    </section>
  );
}
