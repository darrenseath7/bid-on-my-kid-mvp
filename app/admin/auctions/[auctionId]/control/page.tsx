'use client';

import { useMemo, useState } from 'react';
import { AppShell } from '@/components/AppShell';
import { AuctionStateBanner } from '@/components/AuctionStateBanner';
import { ArtworkCard } from '@/components/ArtworkCard';
import { FundraisingThermometer } from '@/components/FundraisingThermometer';
import type { AuctionState, Artwork } from '@/lib/types';

const demoArtworks: Artwork[] = [
  { id: '1', auction_id: 'demo', child_name: 'Mila', child_surname: 'Naidoo', grade: 'Grade 1', framed_image_url: null, ai_description: null, ai_intro: 'A fearless explosion of colour from an artist who clearly believes white space is for people with less zest.', sort_order: 1, status: 'ready', sold_amount: null },
  { id: '2', auction_id: 'demo', child_name: 'Leo', child_surname: 'Botha', grade: 'Grade 2', framed_image_url: null, ai_description: null, ai_intro: 'A deeply moving family portrait where the dog appears to have achieved senior management status.', sort_order: 2, status: 'ready', sold_amount: null }
];

export default function ControlRoomPage() {
  const [state, setState] = useState<AuctionState>('waiting');
  const [index, setIndex] = useState(0);
  const [highestBid, setHighestBid] = useState(0);
  const [raised, setRaised] = useState(0);
  const artwork = demoArtworks[index];
  const mcLine = useMemo(() => {
    if (state === 'open') return 'Right, collectors, who is opening at R100 for this certified fridge-wall investment?';
    if (state === 'going_once') return 'Going once... this is the moment where favourite-parent status hangs in the balance.';
    if (state === 'going_twice') return 'Going twice... last chance before this masterpiece gets emotionally allocated.';
    if (state === 'sold') return `Sold for R${highestBid}! Magnificent scenes. Someone is having a very peaceful bedtime story tonight.`;
    return 'Start the auction when your parents are ready.';
  }, [state, highestBid]);

  function fakeBid() {
    if (state === 'sold') return;
    setHighestBid((value) => (value === 0 ? 100 : value + 100));
  }

  function sold() {
    setState('sold');
    setRaised((value) => value + highestBid);
  }

  function nextArtwork() {
    setIndex((value) => Math.min(value + 1, demoArtworks.length - 1));
    setHighestBid(0);
    setState('open');
  }

  return (
    <AppShell>
      <div className="mx-auto grid max-w-7xl gap-6 px-6 py-8 lg:grid-cols-[1fr_420px]">
        <div className="space-y-5">
          <AuctionStateBanner state={state} />
          <ArtworkCard artwork={artwork} />
        </div>
        <aside className="space-y-5">
          <FundraisingThermometer amount={raised} />
          <div className="rounded-3xl bg-white p-5 shadow-sm">
            <h2 className="text-2xl font-black">Control room</h2>
            <p className="mt-3 rounded-2xl bg-cream p-4 text-sm leading-6">{mcLine}</p>
            <p className="mt-4 text-sm font-bold text-slate-500">Highest bid</p>
            <p className="text-5xl font-black">R{highestBid}</p>
            <div className="mt-5 grid grid-cols-2 gap-2">
              <button onClick={() => setState('open')} className="rounded-xl bg-ink px-4 py-3 font-bold text-white">Open</button>
              <button onClick={fakeBid} className="rounded-xl bg-zesty px-4 py-3 font-bold text-white">Simulate R100 Bid</button>
              <button onClick={() => setState('going_once')} className="rounded-xl bg-orange-100 px-4 py-3 font-bold">Going once</button>
              <button onClick={() => setState('going_twice')} className="rounded-xl bg-orange-200 px-4 py-3 font-bold">Going twice</button>
              <button onClick={sold} className="col-span-2 rounded-xl bg-berry px-4 py-3 font-bold text-white">SOLD</button>
              <button onClick={nextArtwork} className="col-span-2 rounded-xl bg-cream px-4 py-3 font-bold">Next artwork</button>
            </div>
          </div>
        </aside>
      </div>
    </AppShell>
  );
}
