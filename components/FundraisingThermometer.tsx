export function FundraisingThermometer({ amount, target = 50000 }: { amount: number; target?: number }) {
  const percentage = Math.min(100, Math.round((amount / target) * 100));
  return (
    <div className="rounded-2xl bg-white p-4 shadow-sm">
      <div className="mb-2 flex items-center justify-between text-sm font-semibold">
        <span>Raised tonight</span>
        <span>R{amount.toLocaleString()}</span>
      </div>
      <div className="h-4 overflow-hidden rounded-full bg-orange-100">
        <div className="h-full rounded-full bg-zesty transition-all" style={{ width: `${percentage}%` }} />
      </div>
      <p className="mt-2 text-xs text-slate-500">Target: R{target.toLocaleString()}</p>
    </div>
  );
}
