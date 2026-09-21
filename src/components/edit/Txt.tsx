"use client";

import EditableText from "./EditableText";
import { useSiteText } from "@/components/SiteContentProvider";

// A piece of site copy that the owner can edit in place: shows the saved text
// (or the default) and, in edit mode, becomes editable and saves under `k`.
export default function Txt({
  k,
  as = "span",
  className,
  multiline,
  optional,
  placeholder,
}: {
  k: string;
  as?: keyof React.JSX.IntrinsicElements;
  className?: string;
  multiline?: boolean;
  // Can be left empty (and is then hidden from visitors by its parent).
  optional?: boolean;
  placeholder?: string;
}) {
  const value = useSiteText(k);
  return (
    <EditableText value={value} siteKey={k} as={as} className={className} multiline={multiline} allowEmpty={optional} placeholder={placeholder} />
  );
}
