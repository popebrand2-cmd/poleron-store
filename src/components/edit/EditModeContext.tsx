"use client";

import { createContext, useContext, useState } from "react";

const EditModeContext = createContext<{ isAdmin: boolean; editMode: boolean; setEditMode: (v: boolean) => void }>({
  isAdmin: false,
  editMode: false,
  setEditMode: () => {},
});

export function EditModeProvider({ isAdmin, children }: { isAdmin: boolean; children: React.ReactNode }) {
  const [editMode, setEditMode] = useState(false);
  return (
    <EditModeContext.Provider value={{ isAdmin, editMode: isAdmin && editMode, setEditMode }}>
      {children}
    </EditModeContext.Provider>
  );
}

export function useEditMode() {
  return useContext(EditModeContext);
}
