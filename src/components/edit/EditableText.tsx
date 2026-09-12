"use client";

import { useState } from "react";
import { useEditMode } from "./EditModeContext";
import { saveSiteText, patchHero } from "@/lib/site-edit-client";

type Props = {
  value: string;
  as?: keyof React.JSX.IntrinsicElements;
  className?: string;
  multiline?: boolean;
  // Exactly one of these tells EditableText where a new value should be
  // saved. `siteKey`/`heroField` are plain string identifiers (not callback
  // props) so this component can be rendered from server components, which
  // can't pass functions down to client components; `onSave` is for the
  // "use client" callers (e.g. the editable list items) that already have a
  // direct callback to run.
  siteKey?: string;
  heroField?: "heroEyebrow" | "heroSubtext" | "heroCta" | "accentColor";
  onSave?: (value: string) => void;
};

export default function EditableText({ value, as = "span", className = "", multiline = false, siteKey, heroField, onSave }: Props) {
  const { isAdmin, editMode } = useEditMode();
  const [text, setText] = useState(value);
  const Tag = as as React.ElementType;

  if (!isAdmin || !editMode) {
    return <Tag className={className}>{value}</Tag>;
  }

  function persist(next: string) {
    if (onSave) onSave(next);
    else if (siteKey) saveSiteText(siteKey, next);
    else if (heroField) patchHero({ [heroField]: next });
  }

  return (
    <Tag
      className={`${className} rounded-sm outline-dashed outline-1 outline-offset-2 outline-neon/50 transition hover:bg-neon/10 focus:bg-neon/10 focus:outline-2 focus:outline-neon`}
      contentEditable
      suppressContentEditableWarning
      draggable={false}
      onBlur={(e: React.FocusEvent<HTMLElement>) => {
        const next = (e.currentTarget.textContent ?? "").trim();
        if (next && next !== text) {
          setText(next);
          persist(next);
        } else {
          e.currentTarget.textContent = text;
        }
      }}
      onKeyDown={(e: React.KeyboardEvent<HTMLElement>) => {
        if (!multiline && e.key === "Enter") {
          e.preventDefault();
          (e.currentTarget as HTMLElement).blur();
        }
      }}
    >
      {text}
    </Tag>
  );
}
