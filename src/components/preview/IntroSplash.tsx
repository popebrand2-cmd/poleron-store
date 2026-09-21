"use client";

import { useEffect, useState } from "react";

// Short block-wipe intro, once per browser session. Never intercepts clicks
// (pointer-events: none) and is skipped entirely when the visitor prefers
// reduced motion.
export default function IntroSplash() {
  const [show, setShow] = useState(false);

  useEffect(() => {
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    let seen = false;
    try {
      seen = sessionStorage.getItem("pope-intro") === "1";
      sessionStorage.setItem("pope-intro", "1");
    } catch {}
    if (reduce || seen) return;
    setShow(true);
    const t = setTimeout(() => setShow(false), 1200);
    return () => clearTimeout(t);
  }, []);

  if (!show) return null;
  return (
    <div className="pope-splash" aria-hidden="true">
      <div className="pope-splash-row pope-splash-top">
        {[0, 1, 2, 3, 4].map((i) => (
          <div key={i} className="pope-splash-box" />
        ))}
      </div>
      <div className="pope-splash-row pope-splash-bottom">
        {[0, 1, 2, 3, 4].map((i) => (
          <div key={i} className="pope-splash-box" />
        ))}
      </div>
    </div>
  );
}
