import type { AuctionState } from '@/lib/types';

const labels: Record<AuctionState, string> = {
  waiting: 'Waiting for the auction to start',
  open: 'Bidding is open',
  going_once: 'GOING ONCE',
  going_twice: 'GOING TWICE',
  sold: 'SOLD!',
  completed: 'Auction complete'
};

export function AuctionStateBanner({ state }: { state: AuctionState }) {
  const dramatic = state === 'going_once' || state === 'going_twice' || state === 'sold';
  return (
    <div className={`rounded-2xl p-4 text-center font-black tracking-wide shadow-sm ${dramatic ? 'bg-ink text-white text-3xl animate-pulse' : 'bg-white text-ink text-lg'}`}>
      {labels[state]}
    </div>
  );
}
