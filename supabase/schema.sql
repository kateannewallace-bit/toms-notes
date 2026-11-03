-- Tom's Chalkboard: progress sync.
-- Run once in the Supabase SQL editor.
--
-- The page never touches the table directly. It can only call the two
-- functions below, and only with the SHA-256 hash of a family's private
-- sync code, so one family's progress can't be listed or read by anyone else.

create table if not exists public.chalkboard_progress (
  key        text primary key check (key ~ '^[0-9a-f]{64}$'),
  data       jsonb not null,
  updated_at timestamptz not null default now()
);

alter table public.chalkboard_progress enable row level security;
-- No policies on purpose: anon and signed-in users get no direct table access.
revoke all on public.chalkboard_progress from anon, authenticated;

create or replace function public.chalkboard_get(p_key text)
returns jsonb
language sql
security definer
set search_path = public
as $$
  select data from public.chalkboard_progress where key = p_key;
$$;

create or replace function public.chalkboard_save(p_key text, p_data jsonb)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if p_key !~ '^[0-9a-f]{64}$' then raise exception 'invalid key'; end if;
  if pg_column_size(p_data) > 250000 then raise exception 'progress too large'; end if;
  insert into public.chalkboard_progress as t (key, data, updated_at)
  values (p_key, p_data, now())
  on conflict (key) do update
    set data = excluded.data, updated_at = now()
    -- never let an older copy overwrite newer progress
    where coalesce((t.data->>'updatedAt')::bigint, 0) <= coalesce((excluded.data->>'updatedAt')::bigint, 0);
end;
$$;

revoke all on function public.chalkboard_get(text) from public;
revoke all on function public.chalkboard_save(text, jsonb) from public;
grant execute on function public.chalkboard_get(text) to anon, authenticated;
grant execute on function public.chalkboard_save(text, jsonb) to anon, authenticated;
