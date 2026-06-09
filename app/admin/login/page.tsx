"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import BrandHeader from "@/components/BrandHeader";
import { supabase } from "@/lib/supabase";

export default function AdminLoginPage() {
  const router = useRouter();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [checking, setChecking] = useState(true);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    async function checkExistingSession() {
      const { data } = await supabase.auth.getSession();

      if (data.session) {
        router.replace("/admin");
        return;
      }

      setChecking(false);
    }

    checkExistingSession();
  }, [router]);

  async function login() {
    if (!email.trim()) {
      alert("Please enter your admin email address.");
      return;
    }

    if (!password.trim()) {
      alert("Please enter your password.");
      return;
    }

    setLoading(true);

    const { error } = await supabase.auth.signInWithPassword({
      email: email.trim().toLowerCase(),
      password,
    });

    setLoading(false);

    if (error) {
      alert(error.message);
      return;
    }

    router.push("/admin");
  }

  if (checking) {
    return (
      <main className="min-h-screen bg-[#07152b] text-white flex items-center justify-center">
        Checking admin session...
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[#07152b] text-white px-5 py-8 flex items-center justify-center">
      <div className="w-full max-w-md">
        <div className="bg-white rounded-[32px] p-6 mb-6">
          <BrandHeader center />
        </div>

        <section className="bg-white/10 border border-white/10 rounded-[36px] p-7 shadow-2xl">
          <p className="uppercase tracking-[0.35em] text-xs text-white/40 font-black mb-4">
            Admin Login
          </p>

          <h1 className="text-5xl font-black leading-none mb-5">
            Enter the control room.
          </h1>

          <p className="text-white/65 text-lg leading-relaxed mb-7">
            Log in with your Supabase admin user to manage auctions, artworks,
            school details, sales, invoices, and certificates.
          </p>

          <input
            type="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            placeholder="Admin email"
            className="w-full rounded-2xl border border-white/10 bg-white/10 px-5 py-5 text-lg font-bold outline-none mb-4 placeholder:text-white/35"
          />

          <input
            type="password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter") {
                login();
              }
            }}
            placeholder="Password"
            className="w-full rounded-2xl border border-white/10 bg-white/10 px-5 py-5 text-lg font-bold outline-none mb-4 placeholder:text-white/35"
          />

          <button
            onClick={login}
            disabled={loading}
            className="w-full bg-[#16d66d] text-[#07152b] rounded-2xl py-5 font-black text-xl shadow-xl disabled:opacity-50"
          >
            {loading ? "Logging in..." : "Login to Admin"}
          </button>

          <a
            href="/"
            className="block text-center text-white/45 font-bold mt-6 hover:text-white"
          >
            Back to homepage
          </a>
        </section>
      </div>
    </main>
  );
}