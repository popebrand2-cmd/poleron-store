"use client";

import EditableText from "./EditableText";
import { useEditMode } from "./EditModeContext";
import { useContentItems, type ContentItemRow } from "./useContentItems";
import { useDragReorder } from "./dragReorder";
import { DragHandle, DeleteItemButton, AddItemButton } from "./EditItemControls";

export default function FaqList({ initialItems }: { initialItems: ContentItemRow[] }) {
  const { editMode } = useEditMode();
  const { items, addItem, updateItem, removeItem, moveItem } = useContentItems("faq", initialItems);
  const dragProps = useDragReorder(moveItem);

  return (
    <>
      <div className="divide-y divide-black/10 overflow-hidden rounded-2xl bg-white shadow-[0_10px_30px_-20px_rgba(0,0,0,0.4)] ring-1 ring-black/10">
        {items.map((item, i) => (
          <details
            key={item.id}
            {...(editMode ? dragProps(i) : {})}
            open={editMode || undefined}
            className="group p-5 open:bg-[#fafaf7]"
          >
            <summary className="flex cursor-pointer list-none items-center justify-between gap-4 text-sm font-bold text-black">
              <span className="flex-1">
                <EditableText value={item.title} onSave={(v) => updateItem(item.id, { title: v })} as="span" />
              </span>
              <span className="flex shrink-0 items-center gap-2">
                {editMode && <DragHandle />}
                {editMode && <DeleteItemButton onDelete={() => removeItem(item.id)} />}
                <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-black text-neon transition group-open:rotate-45">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="h-3.5 w-3.5">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 5v14M5 12h14" />
                  </svg>
                </span>
              </span>
            </summary>
            <p className="mt-3 text-sm text-neutral-600">
              <EditableText value={item.text} onSave={(v) => updateItem(item.id, { text: v })} as="span" multiline />
            </p>
          </details>
        ))}
      </div>
      {editMode && (
        <div className="mt-6 text-center">
          <AddItemButton onAdd={addItem} label="Agregar pregunta" />
        </div>
      )}
    </>
  );
}
