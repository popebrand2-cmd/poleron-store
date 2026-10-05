"use client";

import { usePathname } from "next/navigation";

// Renders its children on the home page only.
export default function OnlyOnHome({ children }: { children: React.ReactNode }) {
  return usePathname() === "/" ? <>{children}</> : null;
}
