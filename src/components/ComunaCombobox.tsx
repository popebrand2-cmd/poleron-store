"use client";

import { useEffect, useId, useMemo, useRef, useState } from "react";
import { formatCLP } from "@/lib/money";

export type ComunaOption = { comuna: string; priceCLP: number };

function normalize(s: string) {
  return s
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .trim()
    .toLowerCase();
}

// A select you can type into: the list narrows as you write (accents and capitals don't matter, so
// "estacion" finds "Estación Central"), pick with a tap/click or the arrow keys + Enter.
export default function ComunaCombobox({
  id,
  options,
  value,
  onChange,
  disabled,
  placeholder,
}: {
  id: string;
  options: ComunaOption[];
  value: string;
  onChange: (comuna: string) => void;
  disabled?: boolean;
  placeholder: string;
}) {
  const listId = useId();
  const [text, setText] = useState(value);
  const [open, setOpen] = useState(false);
  const [hi, setHi] = useState(0);
  const wrapRef = useRef<HTMLDivElement>(null);
  const listRef = useRef<HTMLUListElement>(null);

  // Follow the chosen value when it changes from outside (e.g. the region was changed and cleared it)
  useEffect(() => setText(value), [value]);

  const filtered = useMemo(() => {
    const q = normalize(text);
    if (!q || (value && normalize(value) === q)) return options;
    return options.filter((o) => normalize(o.comuna).includes(q));
  }, [options, text, value]);

  useEffect(() => setHi(0), [text, open]);
  useEffect(() => {
    listRef.current?.children[hi]?.scrollIntoView({ block: "nearest" });
  }, [hi]);

  useEffect(() => {
    function onDoc(e: MouseEvent | TouchEvent) {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onDoc);
    document.addEventListener("touchstart", onDoc);
    return () => {
      document.removeEventListener("mousedown", onDoc);
      document.removeEventListener("touchstart", onDoc);
    };
  }, []);

  function pick(o: ComunaOption) {
    onChange(o.comuna);
    setText(o.comuna);
    setOpen(false);
  }

  return (
    <div ref={wrapRef} className="relative">
      <input
        id={id}
        type="text"
        role="combobox"
        aria-expanded={open}
        aria-controls={listId}
        aria-autocomplete="list"
        autoComplete="off"
        disabled={disabled}
        value={text}
        placeholder={placeholder}
        onFocus={(e) => {
          setOpen(true);
          e.currentTarget.select();
        }}
        onChange={(e) => {
          setText(e.target.value);
          setOpen(true);
          if (value) onChange("");
        }}
        onKeyDown={(e) => {
          if (e.key === "ArrowDown") {
            e.preventDefault();
            setOpen(true);
            setHi((h) => Math.min(h + 1, filtered.length - 1));
          } else if (e.key === "ArrowUp") {
            e.preventDefault();
            setHi((h) => Math.max(h - 1, 0));
          } else if (e.key === "Enter" && open && filtered[hi]) {
            e.preventDefault();
            pick(filtered[hi]);
          } else if (e.key === "Escape") {
            setOpen(false);
          }
        }}
        className="w-full rounded-md border border-neutral-300 bg-white px-3 py-2 pr-9 disabled:bg-neutral-100 disabled:text-neutral-400"
      />
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-neutral-500" aria-hidden="true">
        <circle cx="11" cy="11" r="6" />
        <path d="M20 20l-4-4" />
      </svg>

      {open && !disabled && (
        <ul
          id={listId}
          ref={listRef}
          role="listbox"
          className="absolute z-20 mt-1 max-h-60 w-full overflow-y-auto rounded-md border border-neutral-200 bg-white shadow-lg"
        >
          {filtered.length === 0 ? (
            <li className="px-3 py-2 text-sm text-neutral-500">No encontramos esa comuna en esta región.</li>
          ) : (
            filtered.map((o, i) => (
              <li
                key={o.comuna}
                role="option"
                aria-selected={o.comuna === value}
                onMouseEnter={() => setHi(i)}
                onMouseDown={(e) => {
                  e.preventDefault();
                  pick(o);
                }}
                className={`flex cursor-pointer items-center justify-between gap-3 px-3 py-2.5 text-sm ${
                  i === hi ? "bg-neutral-100" : ""
                } ${o.comuna === value ? "font-semibold" : ""}`}
              >
                <span>{o.comuna}</span>
                <span className="text-neutral-500">{formatCLP(o.priceCLP)}</span>
              </li>
            ))
          )}
        </ul>
      )}
    </div>
  );
}
