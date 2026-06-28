"use client";

import { ReactNode } from "react";

export default function AdminPanel({
  title,
  eyebrow,
  description,
  action,
  children,
  className = "",
}: {
  title?: string;
  eyebrow?: string;
  description?: string;
  action?: ReactNode;
  children: ReactNode;
  className?: string;
}) {
  return (
    <section className={`rounded-[26px] border border-white/10 bg-[#07162b]/88 p-5 shadow-[0_24px_80px_rgba(0,0,0,0.34)] md:p-6 ${className}`}>
      {(title || eyebrow || description || action) && (
        <div className="mb-5 flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
          <div>
            {eyebrow && <p className="mb-2 text-[10px] font-black uppercase tracking-[0.32em] text-[#16d66d]">{eyebrow}</p>}
            {title && <h2 className="text-2xl font-black tracking-[-0.05em] md:text-3xl">{title}</h2>}
            {description && <p className="mt-1 text-sm font-semibold leading-relaxed text-white/50">{description}</p>}
          </div>
          {action}
        </div>
      )}
      {children}
    </section>
  );
}
