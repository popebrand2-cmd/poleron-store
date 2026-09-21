import { redirect } from "next/navigation";

// The interactive hero was approved and now lives on the home page.
export default function PreviewPage() {
  redirect("/");
}
