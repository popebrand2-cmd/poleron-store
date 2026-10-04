import { prisma } from "@/lib/prisma";
import FeaturedCarousel from "@/components/FeaturedCarousel";
import CollectionsShowcase from "@/components/CollectionsShowcase";
import EditableText from "@/components/edit/EditableText";
import EditableLink from "@/components/edit/EditableLink";
import Txt from "@/components/edit/Txt";
import PopeHero from "@/components/PopeHero";
import CyberGate from "@/components/CyberGate";
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
  const cyberProducts = products.map((p) => ({ id: p.id, slug: p.slug, name: p.name, basePrice: p.basePrice, compareAtPrice: p.compareAtPrice }));
  const cyberActive = isCyberActive(cyberProducts);
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
      <CyberGate active={cyberActive} />

      {/* While the Cyber campaign runs, this interactive lookbook IS the hero — the usual hoodie hero
          just hides (hidden, not removed: PopeHero renders itself again the moment isCyberActive is
          false, with nothing to undo by hand). */}
      <CyberLookbook
        active={cyberActive}
        editorHref={editorHref}
        teeProduct={toLookbookProduct(lookbookTee)}
        hoodieProduct={toLookbookProduct(lookbookHoodie)}
        designs={lookbookDesigns}
        sale={getCyberSaleItems(cyberProducts)
          .slice(0, 3)
          .sort((a, b) => KIND_ORDER[garmentKind(a)] - KIND_ORDER[garmentKind(b)])
          .map((p) => ({ id: p.id, name: p.name, basePrice: p.basePrice, compareAtPrice: p.compareAtPrice as number }))}
      />

      <PopeHero editorHref={editorHref} cyberActive={cyberActive} hidden={cyberActive} />

      {/* Trust right under the hero (shipping, secure payment, guarantee) — before the visitor has to scroll
          to doubt anything. Same editable badges that used to sit at the very bottom. */}
      <section className="border-y border-neutral-800 bg-neutral-950">
        <div className="mx-auto max-w-6xl px-6 py-7">
          <TrustBadgesList initialItems={itemsFor("trustBadges")} />
        </div>
      </section>

      {/* Featured: the base garments with their price come first — this is what is being sold */}
      <section id="tienda" className="scroll-mt-24 bg-black">
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

    </main>
  );
}
