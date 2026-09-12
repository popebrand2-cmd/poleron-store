"use client";

import Icon from "@/components/Icon";
import EditableText from "./EditableText";
import { useEditMode } from "./EditModeContext";
import { useContentItems, type ContentItemRow } from "./useContentItems";
import { useDragReorder } from "./dragReorder";
import { DragHandle, DeleteItemButton, AddItemButton, IconPicker } from "./EditItemControls";

export default function HowItWorksList({ initialItems }: { initialItems: ContentItemRow[] }) {
  const { editMode } = useEditMode();
  const { items, addItem, updateItem, removeItem, moveItem } = useContentItems("howItWorks", initialItems);
  const dragProps = useDragReorder(moveItem);

  return (
    <>
      <div className="grid grid-cols-1 gap-10 sm:grid-cols-3">
        {items.map((step, i) => (
          <div key={step.id} {...(editMode ? dragProps(i) : {})} className="relative text-center">
            <span className="pointer-events-none absolute -top-6 left-1/2 -translate-x-1/2 text-6xl font-black text-white/[0.06]">
              {String(i + 1).padStart(2, "0")}
            </span>
            {editMode && (
              <div className="absolute -top-1 right-0 flex items-center gap-1">
                <DragHandle />
                <DeleteItemButton onDelete={() => removeItem(step.id)} />
              </div>
            )}
            <div className="relative flex flex-col items-center">
              <span className="mb-2 flex h-14 w-14 items-center justify-center rounded-full border border-neutral-700 text-neon">
                <Icon name={step.icon} className="h-7 w-7" />
              </span>
              {editMode && <IconPicker value={step.icon} onChange={(icon) => updateItem(step.id, { icon })} />}
              <p className="mt-2 text-sm font-extrabold uppercase tracking-wide text-white">
                <EditableText value={step.title} onSave={(v) => updateItem(step.id, { title: v })} as="span" />
              </p>
              <p className="mt-2 max-w-xs text-sm text-neutral-400">
                <EditableText value={step.text} onSave={(v) => updateItem(step.id, { text: v })} as="span" multiline />
              </p>
            </div>
          </div>
        ))}
      </div>
      {editMode && (
        <div className="mt-8 text-center">
          <AddItemButton onAdd={addItem} label="Agregar paso" />
        </div>
      )}
    </>
  );
}
