-- Bid On My Kid MVP schema
-- Run this in Supabase SQL editor.

create extension if not exists "uuid-ossp";

create table if not exists schools (
  id uuid primary key default uuid_generate_v4(),
  name text not null,
  website_url text,
  logo_url text,
  primary_colour text default '#ff7a1a',
  secondary_colour text default '#9b2c77',
  bank_name text,
  bank_account_name text,
  bank_account_number text,
  bank_branch_code text,
  created_at timestamptz default now()
);

create table if not exists school_users (
  id uuid primary key default uuid_generate_v4(),
  school_id uuid references schools(id) on delete cascade,
  name text not null,
  surname text,
  email text not null,
  role text default 'admin',
  created_at timestamptz default now()
);

create table if not exists auctions (
  id uuid primary key default uuid_generate_v4(),
  school_id uuid references schools(id) on delete cascade,
  title text not null,
  grade_label text,
  scheduled_at timestamptz,
  status text default 'draft' check (status in ('draft','scheduled','live','completed')),
  live_state text default 'waiting' check (live_state in ('waiting','open','going_once','going_twice','sold','completed')),
  current_artwork_id uuid,
  total_raised integer default 0,
  created_at timestamptz default now()
);

create table if not exists artworks (
  id uuid primary key default uuid_generate_v4(),
  auction_id uuid references auctions(id) on delete cascade,
  child_name text not null,
  child_surname text not null,
  grade text not null,
  original_image_url text,
  enhanced_image_url text,
  framed_image_url text,
  ai_description text,
  ai_intro text,
  sort_order integer default 0,
  status text default 'pending' check (status in ('pending','ready','live','sold','skipped')),
  winning_bid_id uuid,
  sold_amount integer,
  created_at timestamptz default now()
);

alter table auctions
add constraint auctions_current_artwork_fk
foreign key (current_artwork_id) references artworks(id) on delete set null;

create table if not exists bidders (
  id uuid primary key default uuid_generate_v4(),
  auction_id uuid references auctions(id) on delete cascade,
  bidder_name text not null,
  email text,
  joined_at timestamptz default now()
);

create table if not exists bids (
  id uuid primary key default uuid_generate_v4(),
  auction_id uuid references auctions(id) on delete cascade,
  artwork_id uuid references artworks(id) on delete cascade,
  bidder_id uuid references bidders(id) on delete cascade,
  bidder_name text not null,
  amount integer not null check (amount > 0),
  created_at timestamptz default now()
);

create table if not exists auction_events (
  id uuid primary key default uuid_generate_v4(),
  auction_id uuid references auctions(id) on delete cascade,
  artwork_id uuid references artworks(id) on delete set null,
  event_type text not null,
  payload jsonb default '{}'::jsonb,
  created_at timestamptz default now()
);

create table if not exists certificates (
  id uuid primary key default uuid_generate_v4(),
  auction_id uuid references auctions(id) on delete cascade,
  artwork_id uuid references artworks(id) on delete cascade,
  bidder_id uuid references bidders(id) on delete cascade,
  certificate_url text,
  invoice_reference text,
  payment_status text default 'unpaid' check (payment_status in ('unpaid','reminder_sent','paid')),
  created_at timestamptz default now()
);

-- Helpful indexes
create index if not exists bids_artwork_amount_idx on bids(artwork_id, amount desc, created_at asc);
create index if not exists artworks_auction_sort_idx on artworks(auction_id, sort_order asc);
create index if not exists bidders_auction_idx on bidders(auction_id);

-- Realtime setup: enable these tables in Supabase Realtime publication if not already enabled.
alter publication supabase_realtime add table auctions;
alter publication supabase_realtime add table artworks;
alter publication supabase_realtime add table bids;
alter publication supabase_realtime add table auction_events;
