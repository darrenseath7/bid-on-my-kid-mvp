import { redirect } from "next/navigation";

export default function AdminArtworksRedirectPage() {
  redirect("/admin/setup");
}
