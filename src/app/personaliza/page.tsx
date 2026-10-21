import { redirect } from "next/navigation";
import { getEditorHref } from "@/lib/editor-product";

export const dynamic = "force-dynamic";

// "Personaliza" in the menu: straight into the editor, on whichever garment it opens with today.
export default async function CustomizePage() {
  redirect(await getEditorHref());
}
