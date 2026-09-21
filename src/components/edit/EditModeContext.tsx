"use client";

import { createContext, useContext, useEffect, useState } from "react";

const EditModeContext = createContext<{ isAdmin: boolean; editMode: boolean; setEditMode: (v: boolean) => void }>({
  isAdmin: false,
  editMode: false,
  setEditMode: () => {},
});

export function EditModeProvider({ isAdmin, children }: { isAdmin: boolean; children: React.ReactNode }) {
  const [editMode, setEditMode] = useState(false);
  // Links like /?editar=1 (from the admin panel) open the page straight in edit mode.
  useEffect(() => {
    if (isAdmin && new URLSearchParams(window.location.search).get("editar") === "1") setEditMode(true);
  }, [isAdmin]);
  return (
    <EditModeContext.Provider value={{ isAdmin, editMode: isAdmin && editMode, setEditMode }}>
      {children}
    </EditModeContext.Provider>
  );
}

export function useEditMode() {
  return useContext(EditModeContext);
}
