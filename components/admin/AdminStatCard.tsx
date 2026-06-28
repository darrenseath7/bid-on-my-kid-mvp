"use client";

import { ReactNode } from "react";

type Tone = "green" | "yellow" | "purple" | "blue";

export default function AdminStatCard({
  label,
  value,
  subtext,
  icon,
  tone = "green",
  highlight = false,
}: {
  label: string;
  value: string;
  subtext?: string;
  icon?: ReactNode;
  tone?: Tone;
  highlight?: boolean;
}) {
  const toneClass = getTone(tone);

  return (
    <div className={`rounded-[22px] border p-4 shadow-[0_22px_70px_rgba(0,0,0,0.32)] ${highlight ? "border-[#16d66d]/30 bg-[#16d66d]/11" : "border-white/10 bg-white/[0.055]"}`}>
      <div className="flex items-center gap-3.5">
        {icon && <div className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-[16px] border ${toneClass}`}>{icon}</div>}
        <div className="min-w-0">
          <p className="text-[9px] font-black uppercase tracking-[0.24em] text-white/42">{label}</p>
          <p className="mt-1 truncate text-2xl font-black tracking-[-0.05em] md:text-3xl">{value}</p>
          {subtext && <p className="mt-0.5 truncate text-xs font-semibold text-white/45">{subtext}</p>}
        </div>
      </div>
    </div>
  );
}

function getTone(tone: Tone) {
  if (tone === "yellow") return "border-[#ffc857]/45 bg-[#ffc857]/12 text-[#ffc857]";
  if (tone === "purple") return "border-[#d36cff]/45 bg-[#d36cff]/12 text-[#d36cff]";
  if (tone === "blue") return "border-[#2878cf]/45 bg-[#2878cf]/12 text-[#69a7ff]";
  return "border-[#16d66d]/45 bg-[#16d66d]/12 text-[#16d66d]";
}
