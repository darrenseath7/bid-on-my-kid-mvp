-- Run on staging first. Reactions never change bids, auction state or sales.
create table if not exists public.auction_reactions (
  id bigint generated always as identity primary key,
  auction_code text not null,
  artwork_id uuid not null,
  bidder_contact_id uuid not null,
  kind text not null check (kind in ('heart', 'cheer', 'dance')),
  time_slot bigint not null,
  created_at timestamptz not null default now(),
  unique (auction_code, artwork_id, bidder_contact_id, time_slot)
);

create index if not exists auction_reactions_recent_idx
  on public.auction_reactions (auction_code, created_at desc);

alter table public.auction_reactions enable row level security;
-- No public policies: the authenticated server route writes events; the
-- existing public-auction-state route returns only kind, id and created_at.
