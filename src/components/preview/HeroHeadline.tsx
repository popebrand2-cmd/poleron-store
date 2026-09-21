"use client";

import EditableText from "@/components/edit/EditableText";
import { useEditMode } from "@/components/edit/EditModeContext";
import { useSiteText } from "@/components/SiteContentProvider";

function Words({ text, start }: { text: string; start: number }) {
  return (
    <>
      {text.split(" ").map((w, i) => (
        <span key={i} className="pope-word mr-[0.22em]" style={{ animationDelay: `${start + i * 0.08}s` }}>
          {w}
        </span>
      ))}
    </>
  );
}

// The two-line headline. It animates word by word for visitors and turns into
// plain editable text when the owner is editing (so typing isn't fought by the animation).
export default function HeroHeadline() {
  const line1 = useSiteText("hero.line1");
  const line2 = useSiteText("hero.line2");
  const { editMode } = useEditMode();

  return (
    <h1 className="font-display text-[5.2rem] font-bold uppercase leading-[0.82] text-white sm:text-[7rem] lg:text-[8.5rem]">
      <span className="block">
        {editMode ? <EditableText value={line1} siteKey="hero.line1" /> : <Words text={line1} start={1.1} />}
      </span>
      <span className="block text-neon">
        {editMode ? <EditableText value={line2} siteKey="hero.line2" /> : <Words text={line2} start={1.4} />}
      </span>
    </h1>
  );
}
