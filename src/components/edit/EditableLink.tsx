"use client";

import Link from "next/link";
import type { ComponentProps } from "react";
import { useEditMode } from "./EditModeContext";

// A link that doesn't navigate while the owner is editing, so its label can be
// clicked and typed into without leaving the page.
export default function EditableLink({ onClick, ...props }: ComponentProps<typeof Link>) {
  const { editMode } = useEditMode();
  return (
    <Link
      {...props}
      onClick={(e) => {
        if (editMode) e.preventDefault();
        onClick?.(e);
      }}
    />
  );
}
