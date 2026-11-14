-- Apply to staging only. Run before deploying the school upload preview.
create table if not exists public.bragwall_school_upload_access (
  auction_code text not null references public.demo_school_profile(auction_code) on delete cascade,
  email text not null,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  primary key (auction_code, email),
  check (email = lower(email))
);

create table if not exists public.bragwall_school_upload_batches (
  id uuid primary key,
  auction_code text not null references public.demo_school_profile(auction_code) on delete cascade,
  submitter_email text not null,
  expected_count integer not null check (expected_count between 1 and 500),
  status text not null default 'draft' check (status in ('draft','submitted','approved')),
  created_at timestamptz not null default now(),
  submitted_at timestamptz,
  approved_at timestamptz
);

create table if not exists public.bragwall_school_upload_rows (
  batch_id uuid not null references public.bragwall_school_upload_batches(id) on delete cascade,
  auction_code text not null,
  row_number integer not null check (row_number between 0 and 499),
  filename text not null,
  first_name text not null,
  surname text not null,
  grade text not null,
  class_name text,
  storage_path text not null,
  voice_path text,
  added_at timestamptz,
  primary key (batch_id, row_number)
);

create index if not exists bragwall_school_upload_rows_code_idx
  on public.bragwall_school_upload_rows(auction_code);

create index if not exists bragwall_school_upload_batches_review_idx
  on public.bragwall_school_upload_batches(status, created_at desc);
alter table public.bragwall_school_upload_access enable row level security;
alter table public.bragwall_school_upload_batches enable row level security;
alter table public.bragwall_school_upload_rows enable row level security;
alter table public.demo_artworks add column if not exists child_voice_path text;
-- No client-side policies. All reads and writes happen through authenticated server routes.

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('school-submissions', 'school-submissions', false, 4000000,
        array['image/jpeg','image/png','image/webp'])
on conflict (id) do update set public = false;
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('school-voices', 'school-voices', false, 2000000,
        array['audio/webm','audio/mp4','audio/mpeg','audio/ogg','audio/x-m4a'])
on conflict (id) do update set public = false;

-- Finalize atomically: a batch cannot be submitted with missing rows.
create or replace function public.bragwall_complete_school_upload(p_batch uuid, p_email text)
returns boolean language plpgsql security invoker as $$
declare b public.bragwall_school_upload_batches%rowtype;
begin
  select * into b from public.bragwall_school_upload_batches
    where id = p_batch and submitter_email = lower(p_email) and status = 'draft' for update;
  if not found then return false; end if;
  if (select count(*) from public.bragwall_school_upload_rows where batch_id = p_batch) <> b.expected_count then
    return false;
  end if;
  update public.bragwall_school_upload_batches
    set status = 'submitted', submitted_at = now() where id = p_batch;
  return true;
end $$;
revoke all on function public.bragwall_complete_school_upload(uuid,text) from public, anon, authenticated;
grant execute on function public.bragwall_complete_school_upload(uuid,text) to service_role;
