'use client';

import { useState } from 'react';
import { AppShell } from '@/components/AppShell';
import { AuctionStateBanner } from '@/components/AuctionStateBanner';
import { ArtworkCard } from '@/components/ArtworkCard';
import { BidPanel } from '@/components/BidPanel';
import { FundraisingThermometer } from '@/components/FundraisingThermometer';
import type { AuctionState, Artwork } from '@/lib/types';

const demoArtwork: Artwork = {
  id: '1',
  auction_id: 'demo',
  child_name: 'Mila',
  child_surname: 'Naidoo',
  grade: 'Grade 1',
  framed_image_url: null,
  ai_description: null,
  ai_intro: 'A fearless explosion of colour from an artist who clearly believes white space is for people with less zest.',
  sort_order: 1,
  status: 'live',
  sold_amount: null
};

export default function ParentAuctionPage() {
  const [bidderName, setBidderName] = useState('');
  const [joined, setJoined] = useState(false);
  const [highestBid, setHighestBid] = useState(0);
  const [state] = useState<AuctionState>('open');
  const [leader, setLeader] = useState('No bids yet');

  if (!joined) {
    return (
      <AppShell>
        <div className="mx-auto flex min-h-screen max-w-md flex-col justify-center px-6">
          <h1 className="text-4xl font-black">Join the auction</h1>
          <p className="mt-3 text-slate-600">Enter your bidder name. Keep it school-friendly, collector.</p>
          <input value={bidderName} onChange={(e) => setBidderName(e.target.value)} className="mt-6 rounded-2xl border p-4 text-lg" placeholder="e.g. Team Naidoo" />
          <button disabled={!bidderName} onClick={() => setJoined(true)} className="mt-4 rounded-2xl bg-ink px-5 py-4 font-bold text-white disabled:opacity-40">Enter auction</button>
        </div>
      </AppShell>
    );
  }

  function placeBid(amount: number) {
    setHighestBid(amount);
    setLeader(bidderName);
  }

  return (
    <AppShell>
      <div className="mx-auto max-w-5xl space-y-4 px-4 py-5">
        <AuctionStateBanner state={state} />
        <FundraisingThermometer amount={highestBid} />
        <ArtworkCard artwork={demoArtwork} />
        <div className="rounded-2xl bg-white p-4 shadow-sm">
          <p className="text-sm font-bold text-slate-500">Leading bidder</p>
          <p className="text-2xl font-black">{leader}</p>
        </div>
        <BidPanel highestBid={highestBid} onBid={placeBid} disabled={state === 'sold'} />
      </div>
    </AppShell>
  );
}
