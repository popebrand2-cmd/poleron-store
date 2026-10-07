"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";

// Elements marked data-reveal rise into view the first time they scroll in. Only what is BELOW the screen when the page
// opens is hidden first (so nothing visible ever blinks, and the page reads fine without JavaScript); reduced motion and
// low-end devices (data-lite) skip it entirely.
export default function ScrollReveal() {
  const pathname = usePathname();
  useEffect(() => {
    const root = document.documentElement;
    if (root.hasAttribute("data-lite") || window.matchMedia("(prefers-reduced-motion: reduce)").matches || !("IntersectionObserver" in window)) return;
    const io = new IntersectionObserver(
      (entries) => {
        for (const e of entries) {
          if (!e.isIntersecting) continue;
          e.target.classList.add("is-in");
          e.target.classList.remove("reveal-wait");
          io.unobserve(e.target);
        }
      },
      { rootMargin: "0px 0px -8% 0px", threshold: 0.08 },
    );
    const arm = (el: Element) => {
      if (el.classList.contains("is-in") || el.classList.contains("reveal-wait")) return;
      const r = el.getBoundingClientRect();
      if (r.top < window.innerHeight * 0.92) return; // already on screen: leave it as it is
      el.classList.add("reveal-wait");
      io.observe(el);
    };
    const scan = () => document.querySelectorAll("[data-reveal]").forEach(arm);
    scan();
    const mo = new MutationObserver(() => scan());
    mo.observe(document.body, { childList: true, subtree: true });
    return () => {
      io.disconnect();
      mo.disconnect();
    };
  }, [pathname]);
  return null;
}
