-- Enhancement 4: Friend Maps + Collaborative Discovery Feed
-- Run this in Supabase SQL Editor (top to bottom). Idempotent-ish via IF NOT EXISTS.

-- =========================================================
-- Tables
-- =========================================================

create table if not exists public.profiles (
  id uuid primary key references auth.users on delete cascade,
  handle text unique not null check (char_length(handle) between 2 and 24),
  color text not null default '#ef4444',
  created_at timestamptz not null default now()
);

create table if not exists public.spots (
  id uuid primary key default gen_random_uuid(),
  owner uuid not null references public.profiles(id) on delete cascade,
  name text not null,
  cuisine text,
  lat double precision not null,
  lng double precision not null,
  neighborhood text,
  city text,
  dishes text[] not null default '{}',
  vibe_tags text[] not null default '{}',
  price_tier int,
  notes text,
  website_url text,
  created_at timestamptz not null default now()
);
create index if not exists spots_owner_idx on public.spots(owner);
create index if not exists spots_created_idx on public.spots(created_at desc);

create table if not exists public.friendships (
  a uuid not null references public.profiles(id) on delete cascade,
  b uuid not null references public.profiles(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (a, b),
  check (a <> b)
);

create table if not exists public.friend_requests (
  from_id uuid not null references public.profiles(id) on delete cascade,
  to_id uuid not null references public.profiles(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (from_id, to_id),
  check (from_id <> to_id)
);

-- =========================================================
-- RLS
-- =========================================================

alter table public.profiles enable row level security;
alter table public.spots enable row level security;
alter table public.friendships enable row level security;
alter table public.friend_requests enable row level security;

-- profiles: anyone authed reads; owner writes
drop policy if exists profiles_select on public.profiles;
create policy profiles_select on public.profiles
  for select using (auth.role() = 'authenticated');

drop policy if exists profiles_insert on public.profiles;
create policy profiles_insert on public.profiles
  for insert with check (id = auth.uid());

drop policy if exists profiles_update on public.profiles;
create policy profiles_update on public.profiles
  for update using (id = auth.uid()) with check (id = auth.uid());

-- spots: readable by owner OR by a friend; writable only by owner
drop policy if exists spots_select on public.spots;
create policy spots_select on public.spots
  for select using (
    owner = auth.uid()
    or exists (
      select 1 from public.friendships f
      where f.a = auth.uid() and f.b = owner
    )
  );

drop policy if exists spots_insert on public.spots;
create policy spots_insert on public.spots
  for insert with check (owner = auth.uid());

drop policy if exists spots_update on public.spots;
create policy spots_update on public.spots
  for update using (owner = auth.uid()) with check (owner = auth.uid());

drop policy if exists spots_delete on public.spots;
create policy spots_delete on public.spots
  for delete using (owner = auth.uid());

-- friendships: readable if you're in the edge; inserts go through RPC only
drop policy if exists friendships_select on public.friendships;
create policy friendships_select on public.friendships
  for select using (auth.uid() in (a, b));

-- no insert/update/delete policies = clients can't mutate directly

-- friend_requests: readable by both sides; insert only by sender
drop policy if exists friend_requests_select on public.friend_requests;
create policy friend_requests_select on public.friend_requests
  for select using (auth.uid() in (from_id, to_id));

drop policy if exists friend_requests_insert on public.friend_requests;
create policy friend_requests_insert on public.friend_requests
  for insert with check (from_id = auth.uid());

drop policy if exists friend_requests_delete on public.friend_requests;
create policy friend_requests_delete on public.friend_requests
  for delete using (auth.uid() in (from_id, to_id));

-- =========================================================
-- RPCs
-- =========================================================

create or replace function public.send_friend_request(other_handle text)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  target uuid;
begin
  select id into target from public.profiles where handle = other_handle;
  if target is null then
    raise exception 'no such handle';
  end if;
  if target = auth.uid() then
    raise exception 'cannot friend yourself';
  end if;
  -- already friends?
  if exists (select 1 from public.friendships where a = auth.uid() and b = target) then
    return;
  end if;
  -- if they already sent you one, just accept
  if exists (select 1 from public.friend_requests where from_id = target and to_id = auth.uid()) then
    perform public.accept_friend_request(target);
    return;
  end if;
  insert into public.friend_requests(from_id, to_id)
    values (auth.uid(), target)
    on conflict do nothing;
end;
$$;

create or replace function public.accept_friend_request(other_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if not exists (
    select 1 from public.friend_requests
    where from_id = other_id and to_id = auth.uid()
  ) then
    raise exception 'no pending request';
  end if;
  delete from public.friend_requests where from_id = other_id and to_id = auth.uid();
  insert into public.friendships(a, b) values (auth.uid(), other_id) on conflict do nothing;
  insert into public.friendships(a, b) values (other_id, auth.uid()) on conflict do nothing;
end;
$$;

-- =========================================================
-- Realtime (idempotent)
-- =========================================================
do $$
declare
  t text;
begin
  for t in select unnest(array['spots','friendships','friend_requests']) loop
    if not exists (
      select 1 from pg_publication_tables
      where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = t
    ) then
      execute format('alter publication supabase_realtime add table public.%I', t);
    end if;
  end loop;
end $$;
