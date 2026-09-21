"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { usePathname } from "next/navigation";
import EditableLink from "@/components/edit/EditableLink";
import { useEditMode } from "@/components/edit/EditModeContext";
import Txt from "@/components/edit/Txt";
import { useSiteImage, useSiteText } from "@/components/SiteContentProvider";
import { setPopupPreview, usePopupPreview } from "@/lib/popup-preview";

const HIDDEN_ON = ["/admin", "/checkout", "/carrito"];
const REMEMBER_MS = 24 * 60 * 60 * 1000;

function hash(s: string): string {
  let h = 5381;
  for (let i = 0; i < s.length; i++) h = ((h << 5) + h + s.charCodeAt(i)) | 0;
  return (h >>> 0).toString(36);
}

// Offer popup. Off until the owner turns it on; shows once per visitor per day
// (and again as soon as the offer's wording changes). Everything in it is editable.
export default function OfferPopup() {
  const pathname = usePathname();
  const { editMode } = useEditMode();
  const preview = usePopupPreview();
  const enabled = useSiteText("popup.enabled") === "1";
  const delay = Math.max(1, Number(useSiteText("popup.delay")) || 4);
  const link = useSiteText("popup.link") || "/#tienda";
  const title = useSiteText("popup.title");
  const text = useSiteText("popup.text");
  const cta = useSiteText("popup.cta");
  const image = useSiteImage("image.popup");
  const storeKey = `pope-popup:${hash(`${title}|${text}|${cta}|${link}`)}`;

  const [autoOpen, setAutoOpen] = useState(false);
  const closeRef = useRef<HTMLButtonElement>(null);
  const hiddenHere = !pathname || HIDDEN_ON.some((p) => pathname.startsWith(p));

  useEffect(() => {
    if (!enabled || editMode || hiddenHere) return;
    try {
      const seen = Number(localStorage.getItem(storeKey) || 0);
      if (seen && Date.now() - seen < REMEMBER_MS) return;
    } catch {}
    const t = setTimeout(() => setAutoOpen(true), delay * 1000);
    return () => clearTimeout(t);
  }, [enabled, editMode, hiddenHere, delay, storeKey]);

  const visible = !hiddenHere && (editMode ? preview : autoOpen && enabled);

  const close = useCallback(() => {
    setAutoOpen(false);
    setPopupPreview(false);
    if (!editMode) {
      try {
        localStorage.setItem(storeKey, String(Date.now()));
      } catch {}
    }
  }, [editMode, storeKey]);

  useEffect(() => {
    if (!visible) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") close();
    };
    document.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    closeRef.current?.focus();
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
    };
  }, [visible, close]);

  if (!visible) return null;

  return (
    <div
      className="pope-popup-backdrop fixed inset-0 z-[70] flex items-center justify-center bg-black/75 p-4 backdrop-blur-sm"
      onClick={(e) => {
        if (e.target === e.currentTarget) close();
      }}
    >
      <div role="dialog" aria-modal="true" aria-labelledby="pope-popup-title" className="pope-popup glass-dark relative w-full max-w-md overflow-hidden rounded-3xl">
        <button
          ref={closeRef}
          type="button"
          onClick={close}
          aria-label="Cerrar"
          className="absolute right-3 top-3 z-20 flex h-10 w-10 items-center justify-center rounded-full bg-black/60 text-white transition hover:bg-neon hover:text-black"
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.2} strokeLinecap="round" className="h-5 w-5" aria-hidden="true">
            <path d="M6 6l12 12M18 6L6 18" />
          </svg>
        </button>

        <div
          className="relative flex h-44 items-center justify-center overflow-hidden sm:h-52"
          style={{ background: "radial-gradient(60% 70% at 50% 60%, color-mix(in srgb, var(--neon) 30%, transparent), transparent 75%), #050505" }}
        >
          {image && (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={image} alt="" draggable={false} className="h-full w-auto max-w-full object-contain" />
          )}
          <Txt k="popup.badge" className="glass-neon absolute left-4 top-4 rounded-full px-3.5 py-1 font-display text-2xl font-bold uppercase leading-none tracking-wide text-black" />
        </div>

        <div className="px-6 pb-6 pt-5 text-center sm:px-8">
          <Txt
            k="popup.title"
            as="h2"
            className="block font-display text-5xl font-bold uppercase leading-[0.9] text-white sm:text-6xl"
          />
          <p id="pope-popup-title" className="sr-only">
            {title}
          </p>
          <Txt k="popup.text" as="p" multiline className="mx-auto mt-3 block max-w-sm text-base leading-snug text-neutral-300" />

          <div className="mt-6 flex flex-col items-center gap-3">
            <EditableLink href={link} onClick={close} className="pope-cta text-black">
              <span className="pope-cta-goo" aria-hidden="true">
                <span className="pope-cta-bg" />
                <span className="pope-cta-drop" />
              </span>
              <Txt
                k="popup.cta"
                className="pope-cta-label whitespace-nowrap px-6 py-3 font-display text-3xl font-bold uppercase leading-none tracking-wide"
              />
              <span className="pope-cta-circle" aria-hidden="true">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.2} className="h-5 w-5">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 12h14M13 6l6 6-6 6" />
                </svg>
              </span>
            </EditableLink>

            {editMode ? (
              <Txt k="popup.dismiss" className="text-sm text-neutral-400 underline underline-offset-2" />
            ) : (
              <button type="button" onClick={close} className="text-sm text-neutral-400 underline underline-offset-2 transition hover:text-white">
                <Txt k="popup.dismiss" />
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
