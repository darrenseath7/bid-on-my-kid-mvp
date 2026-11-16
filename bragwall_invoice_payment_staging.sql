-- Run in BragWall STAGING Supabase before deploying the payment-selection preview.
-- No account is inferred for existing schools; an admin must select and verify one.
create table if not exists public.bragwall_platform_bank (
  id boolean primary key default true check (id),
  account_holder text not null,
  bank_name text not null,
  account_number text not null,
  branch_code text not null,
  account_type text not null,
  updated_at timestamptz not null default now()
);

create table if not exists public.bragwall_school_payment (
  auction_code text primary key references public.demo_school_profile(auction_code) on delete cascade,
  payment_route text not null check (payment_route in ('bragwall', 'school')),
  account_holder text,
  bank_name text,
  account_number text,
  branch_code text,
  account_type text,
  updated_at timestamptz not null default now(),
  check (payment_route = 'bragwall' or
    (nullif(trim(account_holder), '') is not null and
     nullif(trim(bank_name), '') is not null and
     nullif(trim(account_number), '') is not null and
     nullif(trim(branch_code), '') is not null and
     nullif(trim(account_type), '') is not null))
);

create table if not exists public.bragwall_invoice_payment_snapshot (
  artwork_id uuid primary key references public.demo_artworks(id) on delete cascade,
  auction_code text not null,
  payment_route text not null check (payment_route in ('bragwall', 'school')),
  account_holder text not null,
  bank_name text not null,
  account_number text not null,
  branch_code text not null,
  account_type text not null,
  issued_at timestamptz not null default now()
);

alter table public.bragwall_platform_bank enable row level security;
alter table public.bragwall_school_payment enable row level security;
alter table public.bragwall_invoice_payment_snapshot enable row level security;
revoke all on public.bragwall_platform_bank, public.bragwall_school_payment,
  public.bragwall_invoice_payment_snapshot from public, anon, authenticated;

-- An artwork lock makes concurrent first prints pick the same verified account.
create or replace function public.bragwall_issue_invoice_payment(p_code text, p_artwork uuid)
returns public.bragwall_invoice_payment_snapshot
language plpgsql security invoker set search_path = public as $$
declare
  existing public.bragwall_invoice_payment_snapshot%rowtype;
  account public.bragwall_platform_bank%rowtype;
  school_account public.bragwall_school_payment%rowtype;
begin
  perform 1 from public.demo_artworks
    where id = p_artwork and auction_code = p_code
      and (status = 'sold' or status = 'after_auction_request') for update;
  if not found then raise exception 'No sold artwork or invoice request found'; end if;

  select * into existing from public.bragwall_invoice_payment_snapshot
    where artwork_id = p_artwork;
  if found then return existing; end if;

  select * into school_account from public.bragwall_school_payment
    where auction_code = p_code;
  if not found then raise exception 'Set up and verify payment details for this school first'; end if;

  if school_account.payment_route = 'bragwall' then
    select * into account from public.bragwall_platform_bank where id = true;
    if not found then raise exception 'Set up BragWall bank details first'; end if;
    insert into public.bragwall_invoice_payment_snapshot
      (artwork_id, auction_code, payment_route, account_holder, bank_name,
       account_number, branch_code, account_type)
    values (p_artwork, p_code, 'bragwall', account.account_holder, account.bank_name,
      account.account_number, account.branch_code, account.account_type);
  else
    insert into public.bragwall_invoice_payment_snapshot
      (artwork_id, auction_code, payment_route, account_holder, bank_name,
       account_number, branch_code, account_type)
    values (p_artwork, p_code, 'school', school_account.account_holder,
      school_account.bank_name, school_account.account_number,
      school_account.branch_code, school_account.account_type);
  end if;
  select * into existing from public.bragwall_invoice_payment_snapshot
    where artwork_id = p_artwork;
  return existing;
end $$;
revoke all on function public.bragwall_issue_invoice_payment(text,uuid)
  from public, anon, authenticated;
grant execute on function public.bragwall_issue_invoice_payment(text,uuid) to service_role;
