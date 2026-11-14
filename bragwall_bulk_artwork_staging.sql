-- Run on staging first, then on production before deploying this feature.
-- Class is optional and existing artwork uploads remain valid.
begin;
alter table public.demo_artworks add column if not exists class_name text;
alter table public.demo_artworks add column if not exists bulk_source_key text;
create unique index if not exists demo_artworks_bulk_source_key_unique
  on public.demo_artworks (auction_code, bulk_source_key)
  where bulk_source_key is not null;
commit;
