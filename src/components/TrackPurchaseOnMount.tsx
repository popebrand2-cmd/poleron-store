"use client";

import { useEffect } from "react";
import { trackPurchase } from "@/components/MetaPixel";

export default function TrackPurchaseOnMount({ valueCLP, orderId }: { valueCLP: number; orderId: string }) {
  useEffect(() => {
    trackPurchase(valueCLP, orderId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  return null;
}
