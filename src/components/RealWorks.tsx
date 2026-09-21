"use client";

import { useEditMode } from "@/components/edit/EditModeContext";
import Txt from "@/components/edit/Txt";
import { useSiteImages } from "@/components/SiteContentProvider";

const SLOTS = ["image.work1", "image.work2", "image.work3", "image.work4", "image.work5", "image.work6"];

// Photos of garments that were really made. Nothing is shown until the owner uploads real photos
// (edit mode → «Imágenes y contacto»), so the section never displays invented or stock pictures.
export default function RealWorks() {
  const { editMode } = useEditMode();
  const all = useSiteImages();
  const images = SLOTS.map((k) => ({ k, src: all[k] ?? "" })).filter((i) => i.src);

  if (images.length === 0) {
    if (!editMode) return null;
    return (
      <section className="border-t border-neutral-800 bg-black">
        <div className="mx-auto max-w-6xl px-6 py-10 text-center">
          <p className="text-sm text-neutral-400">
            Aquí aparecerán tus trabajos reales. Sube fotos de prendas ya hechas en «Imágenes y contacto» (hasta 6). Mientras no
            subas ninguna, esta sección no se muestra a los visitantes.
          </p>
        </div>
      </section>
    );
  }

  return (
    <section className="border-t border-neutral-800 bg-black">
      <div className="mx-auto max-w-6xl px-6 py-16">
        <div className="mb-10 text-center">
          <Txt k="works.eyebrow" as="p" className="mb-1 block font-script text-3xl text-neon" />
          <Txt k="works.heading" as="h2" className="block text-4xl font-bold uppercase text-white sm:text-5xl" />
          <Txt k="works.subtext" as="p" multiline className="mx-auto mt-2 block max-w-xl text-neutral-400" />
        </div>
        <ul className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-3">
          {images.map((i, n) => (
            <li key={i.k} className="glass overflow-hidden rounded-2xl">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={i.src} alt={`Trabajo real ${n + 1}`} loading="lazy" decoding="async" className="aspect-[4/5] w-full object-cover" />
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
