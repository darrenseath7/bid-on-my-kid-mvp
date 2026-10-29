type BrandHeaderProps = {
  dark?: boolean;
  center?: boolean;
  compact?: boolean;
};

export default function BrandHeader({
  dark = false,
  center = false,
  compact = false,
}: BrandHeaderProps) {
  return (
    <div className={center ? "text-center" : ""}>
      <div className={center ? "flex justify-center" : ""}>
        <img
          src="/bragwall-logo.png"
          alt="BragWall"
          className={`${compact ? "h-14 md:h-16" : "h-20 md:h-24"} w-auto object-contain`}
        />
      </div>

      <p
        className={`mt-3 uppercase tracking-[0.42em] text-[9px] font-black md:text-[10px] ${
          dark ? "text-white/55" : "text-slate-400"
        }`}
      >
        Young Art • Big Pride
      </p>
    </div>
  );
}
