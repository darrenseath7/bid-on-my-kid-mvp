import { redirect } from "next/navigation";

export default function LegacyWinnerPage() {
  redirect("/admin/sales");
}