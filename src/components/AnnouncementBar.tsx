"use client";

import { useEffect, useState } from "react";
import Txt from "./edit/Txt";
import { useEditMode } from "./edit/EditModeContext";

const MESSAGE_KEYS = ["announce.1", "announce.2", "announce.3", "announce.4"];

// Long enough to actually read a message (at 5 s the last one, with the Cyber date, was gone before
// anyone finished it); the bar also holds still while the cursor is on it.
const INTERVAL_MS = 7000;

export default function AnnouncementBar() {
  const [index, setIndex] = useState(0);
  const [paused, setPaused] = useState(false);
  const { editMode } = useEditMode();

  // Don't rotate the message away while the owner is typing in it.
  useEffect(() => {
    if (editMode || paused) return;
    const id = setInterval(() => setIndex((i) => (i + 1) % MESSAGE_KEYS.length), INTERVAL_MS);
    return () => clearInterval(id);
  }, [editMode, paused]);

  function prev() {
    setIndex((i) => (i - 1 + MESSAGE_KEYS.length) % MESSAGE_KEYS.length);
  }
  function next() {
    setIndex((i) => (i + 1) % MESSAGE_KEYS.length);
  }

  return (
    <div
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      className="flex h-9 items-center justify-center gap-3 bg-black/90 backdrop-blur-md px-4 text-[11px] font-semibold tracking-wide text-white sm:text-xs">
      <button
        type="button"
        onClick={prev}
        aria-label="Mensaje anterior"
        className="shrink-0 text-neutral-400 hover:text-white"
      >
        ‹
      </button>
      <Txt key={MESSAGE_KEYS[index]} k={MESSAGE_KEYS[index]} as="p" className="truncate text-center" />
      <button
        type="button"
        onClick={next}
        aria-label="Siguiente mensaje"
        className="shrink-0 text-neutral-400 hover:text-white"
      >
        ›
      </button>
    </div>
  );
}
