"use client";

import { useEditMode } from "@/components/edit/EditModeContext";
import { useSiteText } from "@/components/SiteContentProvider";

// Live Instagram carousel, fed by a real, owner-connected widget (SnapWidget/LightWidget/Elfsight —
// the owner links their own Instagram account on that service and pastes the embed URL it gives
// them here). We never fabricate or hardcode posts; nothing renders until a real URL is set. Every
// photo/video inside the widget already links straight to its real post on Instagram — that click-
// through is the widget's own built-in behavior, not something rendered by this component.
export default function InstagramFeed() {
  const { editMode } = useEditMode();
  const url = useSiteText("setting.instagramWidgetUrl");
  const profileUrl = useSiteText("setting.instagramUrl");

  if (!url) {
    if (!editMode) return null;
    return (
      <section className="border-t border-neutral-800 bg-black">
        <div className="mx-auto max-w-6xl px-6 py-10 text-center">
          <p className="text-sm text-neutral-400">
            Aquí aparecerá tu carrusel de Instagram en vivo. Crea un widget gratis en snapwidget.com (o lightwidget.com),
            conecta ahí tu cuenta real de Instagram, y pega el enlace de inserción en «Imágenes y contacto» → «Instagram en
            vivo». Mientras no lo pegues, esta sección no se muestra a los visitantes.
          </p>
        </div>
      </section>
    );
  }

  return (
    <section className="pope-rise border-t border-neutral-800 bg-black">
      <div className="mx-auto max-w-6xl px-6 py-12">
        <p className="mb-6 text-center text-lg font-bold text-white">
          Mira nuestro{" "}
          {profileUrl ? (
            <a href={profileUrl} target="_blank" rel="noopener noreferrer" className="text-neon transition hover:brightness-110">
              Instagram
            </a>
          ) : (
            <span className="text-neon">Instagram</span>
          )}
        </p>
        <div className="overflow-hidden rounded-2xl">
          <iframe src={url} className="w-full" style={{ border: "none", minHeight: 200 }} loading="lazy" title="Instagram" />
        </div>
        {profileUrl && (
          <p className="mt-4 text-center">
            <a href={profileUrl} target="_blank" rel="noopener noreferrer" className="text-xs font-semibold uppercase tracking-wide text-neutral-400 underline hover:text-white">
              Síguenos en Instagram
            </a>
          </p>
        )}
      </div>
    </section>
  );
}
