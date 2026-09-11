// Placement of a customer's uploaded design within one product view's print
// zone. All positions/sizes are percentages of the ZONE (0-100), not the
// full image, so they stay valid regardless of the photo's pixel size.
export type ViewPlacement = {
  designUrl: string;
  xPct: number; // center X within the zone, 0-100
  yPct: number; // center Y within the zone, 0-100
  widthPct: number; // design width relative to zone width, e.g. 60 = 60% of zone width
  rotationDeg: number;
  zoneWidthCm: number; // real-world print area size the customer chose (<= the admin-defined max)
  zoneHeightCm: number;
};

// Keyed by the ProductView.label ("Frente", "Espalda", ...)
export type DesignPlacementMap = Record<string, ViewPlacement>;

export type CartItem = {
  id: string; // unique cart line id
  productId: string;
  productSlug: string;
  productName: string;
  colorName: string;
  colorHex: string;
  sizeLabel: string;
  unitPrice: number; // CLP
  quantity: number;
  previewImageUrl: string; // data URL snapshot of the primary (first) view
  designPlacement: DesignPlacementMap;
};

export const ORDER_STATUSES = [
  "PENDING_PAYMENT",
  "PAID",
  "IN_PRODUCTION",
  "SHIPPED",
  "CANCELLED",
] as const;

export type OrderStatus = (typeof ORDER_STATUSES)[number];
