-- Apply to STAGING before testing the Preview registration form.
-- Parent phone and consent never appear in the public auction response.
alter table public.auction_bidder_contacts
  add column if not exists bidder_phone_e164 text,
  add column if not exists whatsapp_opt_in_at timestamptz;

alter table public.auction_bidder_contacts enable row level security;
revoke all on table public.auction_bidder_contacts from anon, authenticated;

-- Only numbers approved for winner messages can be stored.
alter table public.auction_bidder_contacts
  drop constraint if exists auction_bidder_contacts_phone_e164_check;
alter table public.auction_bidder_contacts
  add constraint auction_bidder_contacts_phone_e164_check
  check (bidder_phone_e164 is null or bidder_phone_e164 ~ '^\+[1-9][0-9]{7,14}$');

create index if not exists auction_bidder_contacts_whatsapp_opt_in_idx
  on public.auction_bidder_contacts(auction_code, id)
  where whatsapp_opt_in_at is not null and bidder_phone_e164 is not null;

-- The artwork id is unique: repeated SOLD requests cannot queue twice.
create table if not exists public.auction_winner_whatsapp (
  artwork_id uuid primary key references public.demo_artworks(id) on delete cascade,
  auction_code text not null,
  bidder_contact_id uuid not null references public.auction_bidder_contacts(id),
  status text not null default 'pending'
    check (status in ('pending','sending','sent','failed','uncertain')),
  attempts integer not null default 0,
  message_id text,
  last_error text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  sent_at timestamptz
);

alter table public.auction_winner_whatsapp enable row level security;
revoke all on table public.auction_winner_whatsapp from anon, authenticated;

create index if not exists auction_winner_whatsapp_pending_idx
  on public.auction_winner_whatsapp(status, updated_at)
  where status in ('pending','failed','uncertain');
