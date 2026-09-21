// Defaults for the freeform homepage text (SiteText) and the repeatable
// content lists (ContentItem) — these are exactly what page.tsx used to
// hardcode. They're the fallback shown before an admin edits anything, and
// SITE_TEXT_DEFAULTS also documents every valid SiteText key.

export const SITE_TEXT_DEFAULTS: Record<string, string> = {
  "manifesto.title": "No vendemos catálogos.",
  "manifesto.titleAccent": "Hacemos realidad tu idea.",
  "manifesto.subtext":
    "Cada pedido es una colaboración: tú traes la idea, nosotros la construimos en la prenda. Sin diseños genéricos, sin stock repetido — cada pieza existe porque alguien la imaginó.",
  "howItWorks.eyebrow": "Así de simple",
  "howItWorks.heading": "Cómo funciona",
  "browseTypes.heading": "Encuentra tu estilo",
  "featured.eyebrow": "POPE · Hecho para ti",
  "featured.heading": "Lo más buscado",
  "featured.subtext": "Elige tu prenda base y hazla completamente tuya",
  "collections.eyebrow": "POPE · Colecciones",
  "collections.heading": "¿No sabes qué diseñar?",
  "collections.subtext": "Elige uno de estos diseños listos y estámpalo directo en tu prenda — sin partir de cero.",
  "faq.eyebrow": "Dudas",
  "faq.heading": "Preguntas frecuentes",
  "footer.tagline": "Ropa personalizada — subes tu diseño, ves el mockup real y lo recibimos hecho realidad.",
};

export function siteText(map: Record<string, string>, key: string): string {
  return map[key] ?? SITE_TEXT_DEFAULTS[key] ?? "";
}

export type ContentSection = "values" | "howItWorks" | "trustBadges" | "faq";

export const DEFAULT_ICON: Record<ContentSection, string> = {
  values: "upload",
  howItWorks: "upload",
  trustBadges: "shield",
  faq: "",
};

// Fallback rows per section, used only while the DB has zero rows for that
// section (i.e. before an admin has touched it in edit mode).
export const CONTENT_DEFAULTS: Record<ContentSection, { icon: string; title: string; text: string }[]> = {
  values: [
    { icon: "upload", title: "", text: "Tú traes la idea. Nosotros la hacemos realidad en la prenda." },
    { icon: "shirt", title: "", text: "Cada pieza es única — hecha a tu medida, no en serie." },
    { icon: "user", title: "", text: "Aquí no eres cliente. Eres quien diseña." },
  ],
  howItWorks: [
    { icon: "upload", title: "Sube tu diseño", text: "Una foto, un dibujo, un logo o texto. Lo que tengas en mente." },
    {
      icon: "edit",
      title: "Personalízalo en vivo",
      text: "Ajusta tamaño, posición y color sobre la prenda real. Ves el mockup exacto antes de comprar.",
    },
    { icon: "box", title: "Lo hacemos realidad", text: "Lo confeccionamos e imprimimos tal cual lo dejaste. Edición única, hecha para ti." },
  ],
  trustBadges: [
    { icon: "shield", title: "Compra segura", text: "Tu información de pago está protegida." },
    { icon: "truck", title: "Envío a todo Chile", text: "Retiro gratis en Santiago o despacho a domicilio por comuna." },
    { icon: "refresh", title: "Cambios y garantía", text: "Si algo llega con falla de fábrica, lo resolvemos contigo." },
    { icon: "edit", title: "100% Personalizable", text: "Tú diseñas, nosotros lo hacemos realidad." },
  ],
  faq: [
    {
      icon: "",
      title: "¿Puedo ver mi diseño antes de pagar?",
      text: "Sí. El editor te muestra un mockup real sobre la prenda — con tu diseño, tamaño y posición exactos — antes de agregarlo al carrito.",
    },
    {
      icon: "",
      title: "¿Qué puedo subir como diseño?",
      text: "Lo que tengas en mente: una foto, un dibujo, un logo o texto. Tú eliges qué personalizar.",
    },
    {
      icon: "",
      title: "¿Cada prenda es realmente única?",
      text: "Sí. Cada pieza se confecciona bajo pedido con tu diseño — no manejamos stock genérico ni diseños repetidos.",
    },
    {
      icon: "",
      title: "¿Cómo se calcula el envío?",
      text: "Según tu comuna. Eliges dirección de despacho en el checkout y el costo se calcula automáticamente antes de pagar.",
    },
    {
      icon: "",
      title: "¿Los pagos son seguros?",
      text: "Sí, todos los pagos se procesan a través de Mercado Pago — nunca almacenamos tus datos de tarjeta.",
    },
  ],
};

export const DEFAULT_ACCENT_COLOR = "#39FF14";
