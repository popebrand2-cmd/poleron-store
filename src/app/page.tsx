import { prisma } from "@/lib/prisma";
import FeaturedCarousel from "@/components/FeaturedCarousel";
import CollectionCarousel from "@/components/CollectionCarousel";
import EditableText from "@/components/edit/EditableText";
import EditableLink from "@/components/edit/EditableLink";
import Txt from "@/components/edit/Txt";
import PopeHero from "@/components/PopeHero";
import RealWorks from "@/components/RealWorks";
import RealVideos from "@/components/RealVideos";
import HowItWorks from "@/components/preview/HowItWorks";
import TrustBadgesList from "@/components/edit/TrustBadgesList";
import FaqList from "@/components/edit/FaqList";
import { siteText, CONTENT_DEFAULTS, type ContentSection } from "@/lib/site-content";

export const dynamic = "force-dynamic";


export default async function Home() {
  const [products, designCollections, contentItems, siteTextRows] = await Promise.all([
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
  ]);
  // The hero and "Así funciona" buttons go straight to the real editor: the Oversize hoodie
  // (falling back to any other hoodie, then any product).
  const isHoodie = (p: { name: string; slug: string }) => /hoodie|poler[oó]n/i.test(`${p.name} ${p.slug}`);
  const hoodie =
    products.find((p) => isHoodie(p) && /oversize/i.test(`${p.name} ${p.slug}`)) ?? products.find(isHoodie) ?? products[0];
  const editorHref = hoodie ? `/productos/${hoodie.slug}` : "#tienda";
  const collectionsWithDesigns = designCollections.filter((c) => c.designs.length > 0);

  const textMap = Object.fromEntries(siteTextRows.map((t) => [t.key, t.value]));
  const t = (key: string) => siteText(textMap, key);

  function itemsFor(section: ContentSection) {
    const rows = contentItems.filter((c) => c.section === section);
    if (rows.length > 0) return rows.map((r) => ({ id: r.id, icon: r.icon, title: r.title, text: r.text }));
    return CONTENT_DEFAULTS[section].map((d, i) => ({ id: `default-${section}-${i}`, ...d }));
  }

  return (
    <main>
      <PopeHero editorHref={editorHref} />

      {/* Manifesto banner */}
      <section className="border-t border-neutral-800 bg-[#102200] py-14">
        <p className="mx-auto max-w-4xl px-6 text-center font-display text-4xl font-bold uppercase leading-[1] text-white sm:text-5xl lg:text-6xl">
          <EditableText value={t("manifesto.title")} siteKey="manifesto.title" as="span" />{" "}
          <span className="font-script text-[1.15em] font-normal normal-case text-neon">
            <EditableText value={t("manifesto.titleAccent")} siteKey="manifesto.titleAccent" as="span" />
          </span>
        </p>
        <p className="mx-auto mt-5 max-w-lg px-6 text-center text-sm text-neutral-400">
          <EditableText value={t("manifesto.subtext")} siteKey="manifesto.subtext" as="span" multiline />
        </p>
      </section>

      <HowItWorks editorHref={editorHref} />

      {/* Trust badges */}
      <section className="border-t border-neutral-800 bg-neutral-950">
        <div className="mx-auto max-w-6xl px-6 py-12">
          <TrustBadgesList initialItems={itemsFor("trustBadges")} />
        </div>
      </section>

      {/* Featured */}
      <section id="tienda" className="bg-black">
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

      {/* Vertical videos of finished garments, as a hand of cards (hidden until the owner uploads some) */}
      <RealVideos />

      {/* Photos of real, finished garments (hidden until the owner uploads some) */}
      <RealWorks />

      {/* Preset design collections */}
      {collectionsWithDesigns.length > 0 && (
        <section id="colecciones" className="border-t border-neutral-800 bg-black">
          <div className="mx-auto max-w-6xl px-6 py-16">
            <div className="mb-10 text-center">
              <p className="mb-3 flex items-center justify-center gap-3 text-xs font-bold uppercase tracking-[0.2em] text-neon">
                <span className="h-px w-8 bg-neon" />
                <EditableText value={t("collections.eyebrow")} siteKey="collections.eyebrow" as="span" />
                <span className="h-px w-8 bg-neon" />
              </p>
              <h2 className="text-4xl font-bold uppercase text-white sm:text-5xl">
                <EditableText value={t("collections.heading")} siteKey="collections.heading" as="span" />
              </h2>
              <p className="mt-2 text-neutral-400">
                <EditableText value={t("collections.subtext")} siteKey="collections.subtext" as="span" multiline />
              </p>
            </div>

            <div className="space-y-10">
              {collectionsWithDesigns.map((c) => (
                <div key={c.id}>
                  <h3 className="mb-4 text-sm font-bold uppercase tracking-widest text-white">{c.name}</h3>
                  <CollectionCarousel designs={c.designs} />
                </div>
              ))}
            </div>

            <div className="mt-10 text-center">
              <EditableLink
                href="#tienda"
                className="group glass-neon inline-flex items-center gap-4 whitespace-nowrap rounded-full py-1.5 pl-7 pr-2 font-script text-2xl font-normal normal-case tracking-normal text-black transition hover:brightness-90"
              >
                <Txt k="collections.cta" />
                <span className="flex h-9 w-9 items-center justify-center rounded-full bg-black text-neon transition group-hover:translate-x-0.5">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="h-4 w-4">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 12h14M13 6l6 6-6 6" />
                  </svg>
                </span>
              </EditableLink>
            </div>
          </div>
        </section>
      )}

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
