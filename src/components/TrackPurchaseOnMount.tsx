"use client";

import { useEffect } from "react";
import { trackPurchase } from "@/components/MetaPixel";
import { once } from "@/lib/track";

export default function TrackPurchaseOnMount({ valueCLP, orderId }: { valueCLP: number; orderId: string }) {
  useEffect(() => {
    // A page reload must not report the same order twice.
    once(`purchase:${orderId}`, () => trackPurchase(valueCLP, orderId));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  return null;
}
