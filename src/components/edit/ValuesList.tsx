"use client";

import Icon from "@/components/Icon";
import EditableText from "./EditableText";
import { useEditMode } from "./EditModeContext";
import { useContentItems, type ContentItemRow } from "./useContentItems";
import { useDragReorder } from "./dragReorder";
import { DragHandle, DeleteItemButton, AddItemButton, IconPicker } from "./EditItemControls";

export default function ValuesList({ initialItems }: { initialItems: ContentItemRow[] }) {
  const { editMode } = useEditMode();
  const { items, addItem, updateItem, removeItem, moveItem } = useContentItems("values", initialItems);
  const dragProps = useDragReorder(moveItem);

  return (
    <ul className="mt-8 space-y-4">
      {items.map((v, i) => (
        <li key={v.id} {...(editMode ? dragProps(i) : {})} className="flex items-start gap-3">
          {editMode && <DragHandle />}
          <span className="mt-0.5 shrink-0 text-neon">
            <Icon name={v.icon} className="h-5 w-5" />
          </span>
          <span className="flex-1 text-sm text-neutral-300">
            <EditableText value={v.text} onSave={(val) => updateItem(v.id, { text: val })} as="span" multiline />
          </span>
          {editMode && <IconPicker value={v.icon} onChange={(icon) => updateItem(v.id, { icon })} />}
          {editMode && <DeleteItemButton onDelete={() => removeItem(v.id)} />}
        </li>
      ))}
      {editMode && (
        <li>
          <AddItemButton onAdd={addItem} label="Agregar valor" />
        </li>
      )}
    </ul>
  );
}
