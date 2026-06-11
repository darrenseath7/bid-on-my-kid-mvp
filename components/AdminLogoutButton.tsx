"use client";

import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";

export default function AdminLogoutButton() {
  const router = useRouter();

  async function logout() {
    await supabase.auth.signOut();
    router.replace("/");
  }

  return (
    <button
      onClick={logout}
      className="w-full rounded-2xl bg-[#ef2b20] text-white px-4 py-3 font-black hover:opacity-90 transition"
    >
      Logout
    </button>
  );
}