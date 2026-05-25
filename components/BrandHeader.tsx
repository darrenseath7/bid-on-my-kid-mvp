type BrandHeaderProps = {
  dark?: boolean;
  center?: boolean;
};

export default function BrandHeader({
  dark = false,
  center = false,
}: BrandHeaderProps) {
  return (
    <div className={center ? "text-center" : ""}>
      <div className={center ? "flex justify-center" : ""}>
        <img
          src="/bragwall-logo.png"
          alt="BragWall"
          className="h-16 w-auto object-contain"
        />
      </div>

      <p
        className={`mt-2 uppercase tracking-[0.45em] text-[10px] font-bold ${
          dark ? "text-white/50" : "text-slate-400"
        }`}
      >
        Young Art • Big Pride
      </p>
    </div>
  );
}