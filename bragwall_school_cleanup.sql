-- Run on STAGING first. Run on production only after Preview testing and approval.
-- The two functions are callable by the server's service_role only.
begin;
create schema if not exists bragwall_cleanup_backup;
revoke all on schema bragwall_cleanup_backup from public, anon, authenticated;

create table if not exists bragwall_cleanup_backup.school_rows (
  batch_id text not null,
  auction_code text not null,
  source_table text not null,
  row_data jsonb not null,
  saved_at timestamptz not null default now()
);
revoke all on bragwall_cleanup_backup.school_rows from public, anon, authenticated;

create or replace function public.preview_bragwall_school_cleanup(p_code text)
returns jsonb
language plpgsql security definer
set search_path = pg_catalog, public
as $$
declare
  item record;
  result jsonb := '{}'::jsonb;
  n bigint;
  name text;
  sold_count bigint;
begin
  if p_code is null or p_code !~ '^[a-z0-9][a-z0-9-]{0,79}$' then
    raise exception 'Invalid school code';
  end if;
  select school_name into name from public.demo_school_profile where auction_code = p_code;
  if name is null and not exists (
    select 1 from public.demo_artworks where auction_code = p_code
  ) and not exists (
    select 1 from public.live_auction_state where auction_code = p_code
  ) then
    raise exception 'School was not found in the admin school list';
  end if;
  name := coalesce(nullif(name, ''), p_code);
  for item in
    select t.table_name
    from information_schema.tables t
    join information_schema.columns c on c.table_schema=t.table_schema and c.table_name=t.table_name and c.column_name='auction_code'
    where t.table_schema='public' and t.table_type='BASE TABLE'
  loop
    execute format('select count(*) from public.%I where auction_code=$1', item.table_name)
      into n using p_code;
    result := result || jsonb_build_object(item.table_name, n);
  end loop;
  select count(*) into sold_count from public.demo_artworks
  where auction_code=p_code and status='sold';
  return jsonb_build_object('code', p_code, 'name', name, 'sold', sold_count, 'counts', result);
end;
$$;

create or replace function public.remove_bragwall_test_school(
  p_code text, p_confirmation text, p_expected_counts jsonb, p_expected_sold bigint
) returns text
language plpgsql security definer
set search_path = pg_catalog, public
as $$
declare
  snapshot jsonb;
  item record;
  batch text;
  remaining bigint;
  live_status text;
  scheduler_on boolean;
  controller_running boolean;
begin
  if p_code is null or p_code !~ '^[a-z0-9][a-z0-9-]{0,79}$'
     or p_confirmation is distinct from p_code then
    raise exception 'Type the exact school code to confirm removal';
  end if;
  -- Serialise removal against another cleanup of the same school.
  perform pg_advisory_xact_lock(hashtext('bragwall-cleanup:' || p_code));
  snapshot := public.preview_bragwall_school_cleanup(p_code);
  if p_expected_counts is distinct from snapshot->'counts'
     or p_expected_sold is distinct from (snapshot->>'sold')::bigint then
    raise exception 'School data changed; preview it again before removing';
  end if;
  select status into live_status from public.live_auction_state where auction_code=p_code for update;
  select enabled into scheduler_on from public.auction_scheduler_config
    where auction_code=p_code for update;
  select exists (
    select 1 from public.auction_controller_locks
    where auction_code=p_code and lease_expires_at > clock_timestamp()
  ) into controller_running;
  if coalesce(scheduler_on,false) or controller_running then
    raise exception 'Stop this school scheduler or live controller before removal';
  end if;
  if live_status is not null and live_status not in
    ('waiting','sold','complete','completed','ended') then
    raise exception 'This auction is active; move it to waiting or finish it first';
  end if;
  batch := p_code || '-' || to_char(clock_timestamp(), 'YYYYMMDD-HH24MISS-US');
  for item in
    select t.table_name from information_schema.tables t
    join information_schema.columns c on c.table_schema=t.table_schema and c.table_name=t.table_name and c.column_name='auction_code'
    where t.table_schema='public' and t.table_type='BASE TABLE'
    order by t.table_name
  loop
    execute format('insert into bragwall_cleanup_backup.school_rows(batch_id,auction_code,source_table,row_data)
                    select $1,$2,$3,to_jsonb(x) from public.%I x where x.auction_code=$2',item.table_name)
      using batch,p_code,item.table_name;
  end loop;
  -- Remove dependent records first; any unknown FK failure rolls back this whole function.
  for item in
    select t.table_name from information_schema.tables t
    join information_schema.columns c on c.table_schema=t.table_schema and c.table_name=t.table_name and c.column_name='auction_code'
    where t.table_schema='public' and t.table_type='BASE TABLE'
    order by case t.table_name
       when 'auction_winner_whatsapp' then 0
       when 'live_auction_state' then 2
       when 'demo_artworks' then 3
       when 'auction_bidder_contacts' then 4
       when 'demo_school_profile' then 5
       else 1 end, t.table_name
  loop
    execute format('delete from public.%I where auction_code=$1',item.table_name) using p_code;
  end loop;
  for item in
    select t.table_name from information_schema.tables t
    join information_schema.columns c on c.table_schema=t.table_schema and c.table_name=t.table_name and c.column_name='auction_code'
    where t.table_schema='public' and t.table_type='BASE TABLE'
  loop
    execute format('select count(*) from public.%I where auction_code=$1',item.table_name) into remaining using p_code;
    if remaining <> 0 then raise exception 'School cleanup incomplete: %', item.table_name; end if;
  end loop;
  return batch;
end;
$$;

revoke all on function public.preview_bragwall_school_cleanup(text) from public, anon, authenticated;
revoke all on function public.remove_bragwall_test_school(text,text,jsonb,bigint) from public, anon, authenticated;
grant execute on function public.preview_bragwall_school_cleanup(text) to service_role;
grant execute on function public.remove_bragwall_test_school(text,text,jsonb,bigint) to service_role;
commit;
