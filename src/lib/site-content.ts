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
  "footer.script": "Tu idea, tu estilo, tu esencia.",
  "footer.motto": "Personaliza / Crea / Viste",
  "footer.cart": "Carrito",
  "footer.copyright": "POPE. Todos los derechos reservados.",

  "announce.1": "📦 ENVÍO GRATIS SOBRE $70.000 EN LA REGIÓN METROPOLITANA",
  "announce.2": "🎨 SUBE TU PROPIO DISEÑO Y VE EL MOCKUP REAL ANTES DE COMPRAR",
  "announce.3": "🧵 CADA PRENDA ES UNA EDICIÓN DE UNA SOLA PERSONA: TÚ",
  "nav.home": "Inicio",
  "nav.shop": "Tienda",
  "nav.collections": "Colecciones",

  "hero.line1": "TU IDEA.",
  "hero.line2": "TU PRENDA.",
  "hero.subtext": "Personaliza tu ropa y mira cómo queda antes de comprar.",
  "hero.tagline": "Tu idea, tu estilo, tu esencia.",
  "hero.cta": "Diseña la tuya",
  "hero.disclaimer": "Imagen ilustrativa: el resultado final puede variar según el diseño y la prenda.",
  "hero.colorLabel": "Elige el color",
  "hero.colorBlack": "Negro",
  "hero.colorWhite": "Blanco",
  "hero.before": "Antes",
  "hero.after": "Después",
  "hero.hintMouse": "Pasa el cursor sobre la prenda",
  "hero.hintTouch": "Toca y arrastra sobre la prenda",

  "how.title": "Así funciona",
  "how.subtitle": "De tu idea a tu prenda.",
  "how.tag1": "Sube",
  "how.tag2": "Personaliza",
  "how.tag3": "Creamos",
  "how.title1": "Sube tu diseño",
  "how.title2": "Personaliza en vivo",
  "how.title3": "Lo hacemos realidad",
  "how.text1": "Foto, logo, dibujo o texto.",
  "how.text2": "Ajusta tu diseño y mira cómo queda.",
  "how.text3": "Nosotros producimos tu prenda personalizada.",
  "how.fmt1": "Foto",
  "how.fmt2": "Logo",
  "how.fmt3": "Dibujo",
  "how.fmt4": "Texto",
  "how.phone": "Tu diseño",
  "how.file": "mi-diseño.png",
  "how.ctlSize": "Tamaño",
  "how.ctlPos": "Posición",
  "how.done": "Hecha para ti",
  "how.cta": "Diseña la tuya",
  "how.disclaimer": "Las imágenes son ilustrativas: el resultado final depende de tu diseño y de la prenda.",

  "browseTypes.prefix": "POPE",
  "browse.hoodies": "Polerones",
  "browse.tees": "Poleras",
  "collections.cta": "Personaliza aquí",

  "info.production": "Cada prenda se confecciona bajo pedido con tu diseño.",
  "info.lead": "",
  "info.delivery": "Retiro gratis en Santiago o despacho a domicilio por comuna. El costo se calcula en el checkout, antes de pagar.",
  "info.payment": "Pagas con Mercado Pago. Nunca almacenamos los datos de tu tarjeta.",
  "info.warranty": "Si algo llega con falla de fábrica, lo resolvemos contigo.",
  "info.vat": "",
  "info.contact": "¿Dudas antes de comprar? Escríbenos por WhatsApp.",
  "videos.eyebrow": "Pruebas reales",
  "videos.heading": "Míralos en acción",
  "videos.subtext": "Elige una carta y mira una prenda ya hecha por POPE.",
  "videos.all": "Todos",
  "video.1.src": "",
  "video.1.tag": "",
  "video.1.caption": "",
  "video.2.src": "",
  "video.2.tag": "",
  "video.2.caption": "",
  "video.3.src": "",
  "video.3.tag": "",
  "video.3.caption": "",
  "video.4.src": "",
  "video.4.tag": "",
  "video.4.caption": "",
  "video.5.src": "",
  "video.5.tag": "",
  "video.5.caption": "",
  "video.6.src": "",
  "video.6.tag": "",
  "video.6.caption": "",
  "video.7.src": "",
  "video.7.tag": "",
  "video.7.caption": "",
  "video.8.src": "",
  "video.8.tag": "",
  "video.8.caption": "",
  "works.eyebrow": "Trabajos reales",
  "works.heading": "Hechos por POPE",
  "works.subtext": "Prendas que ya fueron confeccionadas para nuestros clientes.",
  "popup.enabled": "0",
  "popup.delay": "4",
  "popup.link": "/#tienda",
  "popup.badge": "Oferta",
  "popup.title": "Tu diseño, con oferta",
  "popup.text": "Escribe aquí los detalles de tu oferta: qué incluye y hasta cuándo está disponible.",
  "popup.cta": "Aprovechar",
  "popup.dismiss": "No, gracias",
  "setting.instagramUrl": "",
  "setting.facebookUrl": "",
  "footer.follow": "Síguenos",
  "setting.whatsappNumber": "56995162982",
  "setting.whatsappMessage": "Hola! Tengo una consulta sobre mi personalización en POPE.",
};

// Replaceable pictures. Stored in SiteText under these keys (value = URL);
// the defaults below are the files that ship with the site.
export const SITE_IMAGE_DEFAULTS: Record<string, string> = {
  "image.logo": "/brand/pope-logo.png",
  "image.signature": "/brand/pope-firma.png",
  "image.hoodieBlack": "/preview/hoodie-before.webp",
  "image.hoodieWhite": "/preview/hoodie-white-before.webp",
  "image.designOnBlack": "/preview/design-sample.png",
  "image.designOnWhite": "/preview/design-sample-black.png",
  "image.popup": "/preview/hoodie-after.webp",
  // Real photos of finished garments — empty until the owner uploads them.
  "image.work1": "",
  "image.work2": "",
  "image.work3": "",
  "image.work4": "",
  "image.work5": "",
  "image.work6": "",
};

export const SITE_IMAGE_LABELS: Record<string, { label: string; hint: string }> = {
  "image.logo": { label: "Logo POPE", hint: "Se ve en el menú y en el pie de página." },
  "image.signature": { label: "Firma junto a la capucha", hint: "PNG con fondo transparente." },
  "image.hoodieBlack": { label: "Polerón negro (sin diseño)", hint: "Foto en proporción 1200×990, fondo transparente." },
  "image.hoodieWhite": { label: "Polerón blanco (sin diseño)", hint: "Misma proporción y encuadre que el negro." },
  "image.designOnBlack": { label: "Diseño de muestra sobre el negro", hint: "PNG transparente, cuadrado." },
  "image.designOnWhite": { label: "Diseño de muestra sobre el blanco", hint: "PNG transparente, cuadrado." },
  "image.popup": { label: "Imagen del popup de oferta", hint: "PNG/WEBP con fondo transparente o negro." },
  "image.work1": { label: "Foto real 1", hint: "Una prenda ya fabricada (vertical, 4:5)." },
  "image.work2": { label: "Foto real 2", hint: "Una prenda ya fabricada." },
  "image.work3": { label: "Foto real 3", hint: "Una prenda ya fabricada." },
  "image.work4": { label: "Foto real 4", hint: "Una prenda ya fabricada." },
  "image.work5": { label: "Foto real 5", hint: "Una prenda ya fabricada." },
  "image.work6": { label: "Foto real 6", hint: "Una prenda ya fabricada." },
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

export const DEFAULT_ACCENT_COLOR = "#B6FF00";
