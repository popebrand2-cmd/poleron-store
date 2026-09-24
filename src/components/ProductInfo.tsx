"use client";

import type { ReactNode } from "react";
import Txt from "@/components/edit/Txt";
import { useEditMode } from "@/components/edit/EditModeContext";
import { useSiteText, useSiteTexts } from "@/components/SiteContentProvider";
import { SocialButton, useSocials } from "@/components/SocialLinks";

const Icon = ({ children }: { children: ReactNode }) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" className="h-5 w-5 shrink-0" aria-hidden="true">
    {children}
  </svg>
);

const ROWS: { key: string; title: string; icon: ReactNode }[] = [
  { key: "info.production", title: "Fabricación", icon: <Icon><path d="M8 3L3 6l2 4 3-1v11h8V9l3 1 2-4-5-3a4 4 0 01-8 0z" /></Icon> },
  { key: "info.lead", title: "Plazo de entrega", icon: <Icon><circle cx="12" cy="12" r="9" /><path d="M12 7v5l3 2" /></Icon> },
  { key: "info.delivery", title: "Despacho", icon: <Icon><path d="M3 7h11v9H3zM14 10h4l3 3v3h-7" /><circle cx="7" cy="17.5" r="1.6" /><circle cx="17" cy="17.5" r="1.6" /></Icon> },
  { key: "info.payment", title: "Pago", icon: <Icon><rect x="3" y="6" width="18" height="12" rx="2" /><path d="M3 10h18" /></Icon> },
  { key: "info.warranty", title: "Cambios y garantía", icon: <Icon><path d="M12 3l7 3v5c0 5-3 8-7 10-4-2-7-5-7-10V6z" /><path d="M9 12l2 2 4-4" /></Icon> },
];

// Commercial information shown next to the buy button. Every line is editable copy; a line
// with no text (delivery time, VAT) stays hidden from visitors until the owner fills it in,
// so nothing is promised that hasn't been confirmed.
export default function ProductInfo() {
  const { editMode } = useEditMode();
  const socials = useSocials();
  const whatsapp = socials.find((s) => s.kind === "whatsapp");
  const texts = useSiteTexts();
  const filled = (key: string) => (texts[key] ?? "").trim().length > 0;
  const visible = ROWS.filter((r) => editMode || filled(r.key));

  return (
    <section aria-label="Información de compra" className="rounded-xl border border-neutral-200 bg-neutral-50 p-4 lg:p-6">
      <ul className="space-y-3 lg:grid lg:grid-cols-[repeat(auto-fit,minmax(210px,1fr))] lg:gap-x-8 lg:gap-y-5 lg:space-y-0">
        {visible.map((r) => (
          <li key={r.key} className="flex gap-3">
            <span className="mt-0.5 text-neutral-900">{r.icon}</span>
            <div className="min-w-0">
              <p className="text-xs font-bold uppercase tracking-wide text-neutral-500">{r.title}</p>
              <Txt k={r.key} as="p" multiline optional placeholder="Escribe aquí…" className="block min-w-[8rem] text-sm leading-snug text-neutral-800" />
              {editMode && !filled(r.key) && (
                <span className="text-[11px] text-neutral-500">Vacío: no se muestra a los visitantes hasta que lo escribas.</span>
              )}
            </div>
          </li>
        ))}
      </ul>

      {(whatsapp && !whatsapp.missing) || editMode ? (
        <div className="mt-4 flex items-center gap-3 border-t border-neutral-200 pt-3">
          {whatsapp && <SocialButton social={whatsapp} className="!h-10 !w-10 !bg-black" />}
          <Txt k="info.contact" as="p" className="block text-sm text-neutral-700" />
        </div>
      ) : null}
    </section>
  );
}

// "IVA incluido"-style note under the price. Empty until the owner confirms the wording.
export function VatNote({ className = "" }: { className?: string }) {
  const { editMode } = useEditMode();
  const text = useSiteText("info.vat").trim();
  if (!text && !editMode) return null;
  return <Txt k="info.vat" as="p" optional placeholder="Ej.: IVA incluido (escríbelo solo si es cierto)" className={`block min-w-[8rem] text-xs text-neutral-500 ${className}`} />;
}
