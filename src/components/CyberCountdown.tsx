"use client";

import { useEffect, useState } from "react";
import { CYBER_ENDS_AT } from "@/lib/cyber";

function pad(n: number) {
  return String(n).padStart(2, "0");
}

// "4d 01:15:30" ticking down to the end of the Cyber sale; renders nothing until the browser has the time
// (no server/browser mismatch) and once the sale is over.
export default function CyberCountdown({ className = "" }: { className?: string }) {
  const [left, setLeft] = useState<number | null>(null);
  useEffect(() => {
    const tick = () => setLeft(Math.max(0, CYBER_ENDS_AT.getTime() - Date.now()));
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, []);
  if (left == null || left === 0) return null;
  const days = Math.floor(left / 86400000);
  const hours = Math.floor((left % 86400000) / 3600000);
  const minutes = Math.floor((left % 3600000) / 60000);
  const seconds = Math.floor((left % 60000) / 1000);
  return (
    <span className={`tabular-nums ${className}`} aria-live="off">
      {days > 0 && `${days}d `}
      {pad(hours)}:{pad(minutes)}:{pad(seconds)}
    </span>
  );
}
