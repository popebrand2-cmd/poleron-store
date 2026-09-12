"use client";

import Icon from "@/components/Icon";
import EditableText from "./EditableText";
import { useEditMode } from "./EditModeContext";
import { useContentItems, type ContentItemRow } from "./useContentItems";
import { useDragReorder } from "./dragReorder";
import { DragHandle, DeleteItemButton, AddItemButton, IconPicker } from "./EditItemControls";

export default function TrustBadgesList({ initialItems }: { initialItems: ContentItemRow[] }) {
  const { editMode } = useEditMode();
  const { items, addItem, updateItem, removeItem, moveItem } = useContentItems("trustBadges", initialItems);
  const dragProps = useDragReorder(moveItem);

  return (
    <>
      <div className="grid grid-cols-2 gap-8 sm:grid-cols-4">
        {items.map((v, i) => (
          <div key={v.id} {...(editMode ? dragProps(i) : {})} className="relative flex flex-col items-center text-center">
            {editMode && (
              <div className="absolute -top-3 right-0 flex items-center gap-1">
                <DragHandle />
                <DeleteItemButton onDelete={() => removeItem(v.id)} />
              </div>
            )}
            <span className="mb-3 text-neon">
              <Icon name={v.icon} className="h-7 w-7" />
            </span>
            {editMode && <IconPicker value={v.icon} onChange={(icon) => updateItem(v.id, { icon })} />}
            <p className="mt-2 text-xs font-extrabold uppercase tracking-wide text-white">
              <EditableText value={v.title} onSave={(val) => updateItem(v.id, { title: val })} as="span" />
            </p>
            <p className="mt-1 text-xs text-neutral-400">
              <EditableText value={v.text} onSave={(val) => updateItem(v.id, { text: val })} as="span" multiline />
            </p>
          </div>
        ))}
      </div>
      {editMode && (
        <div className="mt-8 text-center">
          <AddItemButton onAdd={addItem} label="Agregar insignia" />
        </div>
      )}
    </>
  );
}
