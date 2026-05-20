export function BidPanel({ highestBid, onBid, disabled }: { highestBid: number; onBid: (amount: number) => void; disabled?: boolean }) {
  const next = highestBid === 0 ? 100 : highestBid + 100;
  const amounts = [next, next + 100, next + 200];
  return (
    <div className="rounded-2xl bg-white p-4 shadow-sm">
      <p className="text-sm font-semibold text-slate-500">Current highest bid</p>
      <p className="text-4xl font-black text-ink">R{highestBid.toLocaleString()}</p>
      <div className="mt-4 grid grid-cols-3 gap-2">
        {amounts.map((amount) => (
          <button
            key={amount}
            disabled={disabled}
            onClick={() => onBid(amount)}
            className="rounded-xl bg-zesty px-3 py-4 text-lg font-black text-white shadow disabled:cursor-not-allowed disabled:opacity-40"
          >
            R{amount}
          </button>
        ))}
      </div>
    </div>
  );
}
