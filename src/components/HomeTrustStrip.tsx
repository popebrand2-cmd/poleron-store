import { prisma } from "@/lib/prisma";
import TrustBadgesList from "@/components/edit/TrustBadgesList";
import { CONTENT_DEFAULTS } from "@/lib/site-content";

// The trust badges (secure payment, shipping, guarantee, 100% customizable): the very last thing on the home page,
// below the footer. The same editable badges as ever — the owner's own rows, or the defaults.
export default async function HomeTrustStrip() {
  const rows = await prisma.contentItem.findMany({ where: { active: true, section: "trustBadges" }, orderBy: { sortOrder: "asc" } });
  const items = rows.length > 0 ? rows.map((r) => ({ id: r.id, icon: r.icon, title: r.title, text: r.text })) : CONTENT_DEFAULTS.trustBadges.map((d, i) => ({ id: `default-trustBadges-${i}`, ...d }));
  return (
    <section className="border-t border-neutral-800 bg-neutral-950">
      <div className="mx-auto max-w-6xl px-6 py-7">
        <TrustBadgesList initialItems={items} />
      </div>
    </section>
  );
}
