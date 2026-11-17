-- Apply only in BragWall STAGING before deploying the winner invoice preview.
-- Existing issued invoices retain their original payment reference and bank snapshot.
begin;

create sequence if not exists public.bragwall_invoice_reference_seq;
revoke all on sequence public.bragwall_invoice_reference_seq from public, anon, authenticated;
grant usage on sequence public.bragwall_invoice_reference_seq to service_role;

alter table public.bragwall_invoice_payment_snapshot
  add column if not exists payment_reference text;

update public.bragwall_invoice_payment_snapshot s
set payment_reference = case s.auction_code
  when 'rynfieldgrade2ab' then 'G2AB-' || lpad(a.sort_order::text, 3, '0') || '-' || upper(left(replace(s.artwork_id::text, '-', ''), 4))
  when 'rynfieldgrade2cd' then 'G2CD-' || lpad(a.sort_order::text, 3, '0') || '-' || upper(left(replace(s.artwork_id::text, '-', ''), 4))
  when 'rynfieldgrade2e' then 'G2E-' || lpad(a.sort_order::text, 3, '0') || '-' || upper(left(replace(s.artwork_id::text, '-', ''), 4))
  else 'BW-' || upper(replace(s.artwork_id::text, '-', ''))
end
from public.demo_artworks a
where a.id = s.artwork_id and s.payment_reference is null;

create unique index if not exists bragwall_invoice_payment_reference_uniq
  on public.bragwall_invoice_payment_snapshot(payment_reference);

create table if not exists public.bragwall_winner_invoice_challenges (
  artwork_id uuid primary key references public.demo_artworks(id) on delete cascade,
  code_hash text not null,
  sent_at timestamptz not null,
  expires_at timestamptz not null,
  attempts integer not null default 0
);
alter table public.bragwall_winner_invoice_challenges enable row level security;
revoke all on public.bragwall_winner_invoice_challenges from public, anon, authenticated;

-- Keep the existing account-locking behaviour. Only new invoices receive short references.
create or replace function public.bragwall_issue_invoice_payment(p_code text, p_artwork uuid)
returns public.bragwall_invoice_payment_snapshot
language plpgsql security invoker set search_path = public as $$
declare
  existing public.bragwall_invoice_payment_snapshot%rowtype;
  account public.bragwall_platform_bank%rowtype;
  school_account public.bragwall_school_payment%rowtype;
  new_reference text;
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

  new_reference := 'BW-' || lpad(nextval('public.bragwall_invoice_reference_seq')::text, 7, '0');
  if school_account.payment_route = 'bragwall' then
    select * into account from public.bragwall_platform_bank where id = true;
    if not found then raise exception 'Set up BragWall bank details first'; end if;
    insert into public.bragwall_invoice_payment_snapshot
      (artwork_id, auction_code, payment_route, payment_reference, account_holder,
       bank_name, account_number, branch_code, account_type)
    values (p_artwork, p_code, 'bragwall', new_reference, account.account_holder,
      account.bank_name, account.account_number, account.branch_code, account.account_type);
  else
    insert into public.bragwall_invoice_payment_snapshot
      (artwork_id, auction_code, payment_route, payment_reference, account_holder,
       bank_name, account_number, branch_code, account_type)
    values (p_artwork, p_code, 'school', new_reference, school_account.account_holder,
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
commit;
