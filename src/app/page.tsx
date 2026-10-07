import Link from "next/link";
import { prisma } from "@/lib/prisma";
import FeaturedCarousel from "@/components/FeaturedCarousel";
import CollectionsShowcase from "@/components/CollectionsShowcase";
import EditableText from "@/components/edit/EditableText";
import EditableLink from "@/components/edit/EditableLink";
import Txt from "@/components/edit/Txt";
import PopeHero from "@/components/PopeHero";
import BannerOffer from "@/components/BannerOffer";
import CyberGate from "@/components/CyberGate";
import CyberIntro from "@/components/CyberIntro";
import CyberLookbook from "@/components/CyberLookbook";
import { isCyberActive, getCyberSaleItems } from "@/lib/cyber";
import { garmentKind } from "@/lib/garments";
import RealWorks from "@/components/RealWorks";
import RealVideos from "@/components/RealVideos";
import ReviewsSection from "@/components/ReviewsSection";
import InstagramFeed from "@/components/InstagramFeed";
import HowItWorks from "@/components/preview/HowItWorks";
import TrustBadgesList from "@/components/edit/TrustBadgesList";
import FaqList from "@/components/edit/FaqList";
import CollectionGarmentsGrid from "@/components/CollectionGarmentsGrid";
import { loadShowcaseItems } from "@/lib/collection-items";
import { loadLimitedCards } from "@/lib/limited";
import LimitedEditionCard from "@/components/LimitedEditionCard";
import { getEditorHref } from "@/lib/editor-product";
import { siteText, CONTENT_DEFAULTS, type ContentSection } from "@/lib/site-content";

export const dynamic = "force-dynamic";

// Polera first, then polerón oversize, then boxifit — the same order as the collection pages.
const KIND_ORDER = { polera: 0, poleron: 1, boxy: 2 } as const;


export default async function Home() {
  const [products, designCollections, contentItems, siteTextRows, reviews] = await Promise.all([
    prisma.product.findMany({
      where: { active: true },
      orderBy: { createdAt: "desc" },
      include: { colors: { include: { views: true } } },
    }),
    prisma.designCollection.findMany({
      where: { active: true },
      orderBy: { sortOrder: "asc" },
      include: { designs: { where: { active: true }, orderBy: { sortOrder: "asc" } } },
    }),
    prisma.contentItem.findMany({ where: { active: true }, orderBy: { sortOrder: "asc" } }),
    prisma.siteText.findMany(),
    prisma.review.findMany({ where: { active: true }, orderBy: { sortOrder: "asc" } }),
  ]);
  const editorHref = await getEditorHref();
  const collectionsWithDesigns = designCollections.filter((c) => c.designs.length > 0);

  // The garments of the collections, ready-made (design printed front and back), right under the hero: the same cards as
  // the collection pages.
  const homeItems = await loadShowcaseItems(8);
  const limitedCards = await loadLimitedCards();
  const cyberProducts = products.map((p) => ({ id: p.id, slug: p.slug, name: p.name, basePrice: p.basePrice, compareAtPrice: p.compareAtPrice }));
  const cyberActive = isCyberActive(cyberProducts);
  // The offer written over the banner photo: only while the sale runs (the same rule as the Cyber strip).
  const bannerSale = cyberActive
    ? getCyberSaleItems(cyberProducts)
        .slice(0, 3)
        .sort((a, b) => KIND_ORDER[garmentKind(a)] - KIND_ORDER[garmentKind(b)])
        .map((p) => ({ id: p.id, name: p.name, basePrice: p.basePrice, compareAtPrice: p.compareAtPrice as number }))
    : [];
  // The Cyber lookbook links each garment to a REAL product/garment type it actually matches — a tee
  // for the 5 t-shirt designs, a hoodie for the 2 hoodie ones — never a made-up one.
  const isHoodieProduct = (p: { name: string; slug: string }) => /hoodie|poler[oó]n/i.test(`${p.name} ${p.slug}`);
  const lookbookHoodie = products.find((p) => isHoodieProduct(p) && /oversize/i.test(p.slug)) ?? products.find(isHoodieProduct) ?? null;
  const lookbookTee = products.find((p) => !isHoodieProduct(p)) ?? null;
  const toLookbookProduct = (p: (typeof products)[number] | null) => (p ? { slug: p.slug, colors: p.colors.map((c) => ({ name: c.name, hex: c.hex })) } : null);
  // Same real catalog the collection pickers use elsewhere (Admin > Colecciones) — so the lookbook
  // cards can flip through actual designs instead of being stuck on one fixed picture per garment.
  const lookbookDesigns = designCollections.flatMap((c) =>
    c.designs.map((d) => ({ id: d.id, name: d.name, imageUrl: d.imageUrl, placement: d.placement as "FRONT" | "BACK" })),
  );
  // Lets a review card link to the real product it's about — never a made-up one.
  const reviewProducts = products.map((p) => ({ slug: p.slug, name: p.name, imageUrl: p.colors[0]?.views[0]?.imageUrl ?? "" }));
  const reviewRows = reviews.map((r) => ({
    id: r.id,
    customerName: r.customerName,
    rating: r.rating,
    text: r.text,
    photoUrl: r.photoUrl,
    productSlug: r.productSlug,
    verified: r.verified,
    reviewDate: r.reviewDate.toISOString(),
  }));

  const textMap = Object.fromEntries(siteTextRows.map((t) => [t.key, t.value]));
  const t = (key: string) => siteText(textMap, key);

  function itemsFor(section: ContentSection) {
    const rows = contentItems.filter((c) => c.section === section);
    if (rows.length > 0) return rows.map((r) => ({ id: r.id, icon: r.icon, title: r.title, text: r.text }));
    return CONTENT_DEFAULTS[section].map((d, i) => ({ id: `default-${section}-${i}`, ...d }));
  }

  return (
    <main>
      {/* Full-screen Cyber welcome with the countdown, once per visit; the slim strip below stays for the rest of the visit. */}
      <CyberIntro products={cyberProducts} active={cyberActive} />
      <CyberGate active={cyberActive} />

      {/* The brand banner (its headline and button are part of the picture). It IS the hero on computer and tablet (the
          Cyber lookbook and the usual hero are phone-only now); on a phone the text inside would be tiny, so phones keep
          the hero below. The whole banner is the "Diseña la tuya" button. */}
      <section aria-label="Tu idea. Tu prenda." className="relative mx-auto hidden max-w-[1600px] bg-black md:block">
        <Link href={editorHref} className="block">
          <picture>
            <source media="(min-width: 768px)" srcSet="/promo/banner-pope-v3.webp" />
            {/* Phones get a 1px placeholder, so the 200 KB banner is never downloaded there. */}
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="data:image/gif;base64,R0lGODlhAQABAAAAACH5BAEKAAEALAAAAAABAAEAAAICTAEAOw=="
              alt="Tu idea. Tu prenda. Elige tu prenda, sube tu diseño y personaliza en vivo. Diseña la tuya en popebrand.cl"
              width={2000}
              height={1126}
              fetchPriority="high"
              className="h-auto w-full"
            />
          </picture>
        </Link>
        {/* The offer, written over the photo (bottom-left, on a dark fade that only covers that corner) */}
        <div className="pointer-events-none absolute bottom-0 left-0 hidden w-[46%] lg:block">
          <div aria-hidden="true" className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/60 to-transparent [mask-image:linear-gradient(to_right,black_72%,transparent)]" />
          <BannerOffer sale={bannerSale} className="relative px-8 pb-6 pt-14 xl:px-10 xl:pb-8" />
        </div>
        {bannerSale.length > 0 && (
          <div className="border-t-[3px] border-red-600 bg-black px-6 py-5 lg:hidden">
            <BannerOffer sale={bannerSale} />
          </div>
        )}
      </section>

      {/* Phone version of the same banner: the photo (cropped, no text) with the headline, steps and button as real text
          underneath, so everything is readable on a small screen. */}
      <section aria-label="Tu idea. Tu prenda." className="relative bg-black md:hidden">
        <Link href={editorHref} className="relative block">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/promo/banner-pope-phone.webp"
            alt="Cliente con una polera personalizada POPE y el personalizador en el celular"
            width={1000}
            height={880}
            fetchPriority="high"
            className="block h-auto w-full"
          />
          <span aria-hidden="true" className="pointer-events-none absolute inset-x-0 bottom-0 h-3/5 bg-gradient-to-t from-black via-black/75 to-transparent" />
        </Link>
        {bannerSale.length > 0 && <BannerOffer sale={bannerSale} size="sm" className="pointer-events-none absolute inset-x-0 top-0 aspect-[1000/880] flex flex-col justify-end px-5 pb-8" />}
        <div className="relative -mt-6 px-5 pb-10">
          <h1 className="font-display text-[4.25rem] font-bold uppercase leading-[0.88] text-white">
            Tu idea.
            <span className="block text-neon">Tu prenda.</span>
          </h1>
          <p className="mt-3 text-[13px] font-bold uppercase tracking-[0.3em] text-white">Elige. Personaliza. Crea.</p>
          <ol className="mt-5 divide-y divide-white/20 border-y border-white/20">
            {["Elige tu prenda", "Sube tu diseño", "Personaliza en vivo"].map((t, i) => (
              <li key={t} className="flex items-center gap-4 py-3 text-lg uppercase text-white">
                <span className="font-display text-3xl font-bold text-neon">{String(i + 1).padStart(2, "0")}</span>
                {t}
              </li>
            ))}
          </ol>
          <Link href={editorHref} className="mt-6 flex min-h-14 items-center justify-center rounded-md bg-neon px-6 font-display text-3xl font-bold uppercase text-black transition active:brightness-90">
            Diseña la tuya
          </Link>
          <p className="mt-4 text-center text-sm font-medium uppercase tracking-[0.35em] text-neutral-300">popebrand.cl</p>
        </div>
      </section>

      {/* The Cyber lookbook and the usual hero are retired from the home page: the banner above is the hero on every
          screen. (Set active back to cyberActive to bring the lookbook back.) */}
      <CyberLookbook
        active={false}
        editorHref={editorHref}
        teeProduct={toLookbookProduct(lookbookTee)}
        hoodieProduct={toLookbookProduct(lookbookHoodie)}
        designs={lookbookDesigns}
        sale={getCyberSaleItems(cyberProducts)
          .slice(0, 3)
          .sort((a, b) => KIND_ORDER[garmentKind(a)] - KIND_ORDER[garmentKind(b)])
          .map((p) => ({ id: p.id, name: p.name, basePrice: p.basePrice, compareAtPrice: p.compareAtPrice as number }))}
      />

      <PopeHero editorHref={editorHref} cyberActive={cyberActive} hidden />

      {/* Limited-edition products: one special card each, the first thing after the banner */}
      {limitedCards.length > 0 && (
        <section id="limitada" aria-label="Edición limitada" className="scroll-mt-24 border-b border-neutral-800 bg-black">
          <div className="mx-auto max-w-6xl space-y-6 px-6 py-10 sm:py-14">
            {limitedCards.map((c) => (
              <LimitedEditionCard key={c.slug} item={c} />
            ))}
          </div>
        </section>
      )}

      {/* The ready-made garments of the collections, right under the offer: seeing the finished piece is what makes
          people buy faster. "Ver ofertas" lands here. */}
      {homeItems.length > 0 && (
        <section id="tienda" className="scroll-mt-24 border-b border-neutral-800 bg-black">
          <div className="mx-auto max-w-6xl px-6 py-10 sm:py-14">
            <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
              <div className="max-w-2xl">
                <h2 className="font-display text-4xl font-bold uppercase leading-none sm:text-5xl">
                  <Txt k="home.garmentsTitle" />
                </h2>
                <Txt k="home.garmentsText" as="p" multiline className="mt-2 block text-sm text-neutral-400" />
              </div>
              <Link href="/colecciones" className="text-xs font-bold uppercase tracking-[0.18em] text-neon transition hover:underline">
                <Txt k="home.garmentsCta" /> →
              </Link>
            </div>
            <CollectionGarmentsGrid items={homeItems} compact />
          </div>
        </section>
      )}

      {/* Featured: the base garments with their price come first — this is what is being sold */}
      <section id={homeItems.length > 0 ? "base" : "tienda"} className="scroll-mt-24 bg-black">
        <div className="mx-auto max-w-6xl px-6 py-16">
          <div className="mb-10 text-center">
            <p className="mb-3 flex items-center justify-center gap-3 text-xs font-bold uppercase tracking-[0.2em] text-neon">
              <span className="h-px w-8 bg-neon" />
              <EditableText value={t("featured.eyebrow")} siteKey="featured.eyebrow" as="span" />
              <span className="h-px w-8 bg-neon" />
            </p>
            <h2 className="text-4xl font-bold uppercase text-white sm:text-5xl">
              <EditableText value={t("featured.heading")} siteKey="featured.heading" as="span" />
            </h2>
            <p className="mt-2 text-neutral-400">
              <EditableText value={t("featured.subtext")} siteKey="featured.subtext" as="span" />
            </p>
          </div>

          {products.length === 0 ? (
            <p className="text-center text-neutral-500">Todavía no hay productos publicados.</p>
          ) : (
            <FeaturedCarousel
              products={products.map((p) => ({
                id: p.id,
                slug: p.slug,
                name: p.name,
                basePrice: p.basePrice,
                compareAtPrice: p.compareAtPrice,
                colors: p.colors.map((c) => ({
                  name: c.name,
                  hex: c.hex,
                  imageUrl: c.views[0]?.imageUrl ?? null,
                })),
              }))}
            />
          )}
        </div>
      </section>

      {/* Artist collections: 3D carousel (each card opens its own catalog page) */}
      {collectionsWithDesigns.length > 0 && (
        <CollectionsShowcase
          artists={collectionsWithDesigns.map((c) => ({
            id: c.id,
            slug: c.slug,
            name: c.name,
            imageUrl: c.photoUrl || c.designs[0].imageUrl,
            category: c.category,
            count: c.designs.length,
          }))}
          eyebrow={<EditableText value={t("collections.eyebrow")} siteKey="collections.eyebrow" as="span" />}
          heading={<EditableText value={t("collections.heading")} siteKey="collections.heading" as="span" />}
          ctaLabel={<Txt k="collections.cta" />}
        />
      )}

      {/* Real customer reviews (hidden until the owner adds real ones) */}
      <ReviewsSection initialItems={reviewRows} products={reviewProducts} />

      <HowItWorks editorHref={editorHref} />

      {/* Vertical videos of finished garments, as a hand of cards (hidden until the owner uploads some) */}
      <RealVideos />

      {/* Photos of real, finished garments (hidden until the owner uploads some) */}
      <RealWorks />

      {/* Live Instagram carousel via an owner-connected widget (hidden until one is configured) */}
      <InstagramFeed />

      {/* FAQ */}
      <section className="border-t border-neutral-800 bg-neutral-950">
        <div className="mx-auto max-w-3xl px-6 py-16">
          <div className="mb-10 text-center">
            <p className="mb-3 flex items-center justify-center gap-3 text-xs font-bold uppercase tracking-[0.2em] text-neon">
              <span className="h-px w-8 bg-neon" />
              <EditableText value={t("faq.eyebrow")} siteKey="faq.eyebrow" as="span" />
              <span className="h-px w-8 bg-neon" />
            </p>
            <h2 className="text-4xl font-bold uppercase text-white sm:text-5xl">
              <EditableText value={t("faq.heading")} siteKey="faq.heading" as="span" />
            </h2>
          </div>
          <FaqList initialItems={itemsFor("faq")} />
        </div>
      </section>

      {/* Trust (shipping, secure payment, guarantee): the very last thing on the page, right above the footer. */}
      <section className="border-y border-neutral-800 bg-neutral-950">
        <div className="mx-auto max-w-6xl px-6 py-7">
          <TrustBadgesList initialItems={itemsFor("trustBadges")} />
        </div>
      </section>

    </main>
  );
}
