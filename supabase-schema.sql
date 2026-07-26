-- גן מזור — סכמת MVP
-- להריץ פעם אחת בלבד בפרויקט Supabase חדש.
create extension if not exists pgcrypto;

create type public.gan_role as enum ('parent','staff','committee','admin');
create type public.calendar_event_type as enum ('event','birthday','holiday','no-kindergarten','reminder');
create type public.community_item_type as enum ('pickup','give','park');

create table public.kindergartens (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text not null unique,
  created_at timestamptz not null default now()
);

create table public.memberships (
  id uuid primary key default gen_random_uuid(),
  kindergarten_id uuid not null references public.kindergartens(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  role public.gan_role not null default 'parent',
  parent_name text not null,
  child_name text not null,
  relation_label text not null default 'הורה של',
  approved boolean not null default false,
  unique(kindergarten_id,user_id)
);

create table public.daily_updates (
  id uuid primary key default gen_random_uuid(),
  kindergarten_id uuid not null references public.kindergartens(id) on delete cascade,
  update_date date not null,
  morning_staff jsonb not null default '[]'::jsonb,
  afternoon_staff jsonb not null default '[]'::jsonb,
  meeting_title text,
  meeting_details text,
  activity_title text,
  reminder text,
  shabbat_children jsonb not null default '[]'::jsonb,
  updated_by uuid references auth.users(id),
  updated_at timestamptz not null default now(),
  unique(kindergarten_id,update_date)
);

create table public.calendar_events (
  id uuid primary key default gen_random_uuid(),
  kindergarten_id uuid not null references public.kindergartens(id) on delete cascade,
  event_date date not null,
  title text not null,
  details text,
  event_type public.calendar_event_type not null default 'event',
  created_by uuid references auth.users(id),
  created_at timestamptz not null default now()
);

create table public.albums (
  id uuid primary key default gen_random_uuid(),
  kindergarten_id uuid not null references public.kindergartens(id) on delete cascade,
  album_date date not null,
  expires_at timestamptz not null,
  created_by uuid references auth.users(id),
  unique(kindergarten_id,album_date)
);

create table public.album_photos (
  id uuid primary key default gen_random_uuid(),
  album_id uuid not null references public.albums(id) on delete cascade,
  storage_path text not null,
  created_at timestamptz not null default now()
);

create table public.community_items (
  id uuid primary key default gen_random_uuid(),
  kindergarten_id uuid not null references public.kindergartens(id) on delete cascade,
  created_by uuid not null references auth.users(id) on delete cascade,
  item_type public.community_item_type not null,
  child_name text,
  item_name text,
  garden_name text,
  status text not null default 'open' check(status in ('open','closed')),
  expires_at timestamptz not null default (now()+interval '24 hours'),
  created_at timestamptz not null default now()
);

create table public.community_responses (
  id uuid primary key default gen_random_uuid(),
  community_item_id uuid not null references public.community_items(id) on delete cascade,
  responder_id uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  unique(community_item_id,responder_id)
);

create table public.committee_funds (
  kindergarten_id uuid primary key references public.kindergartens(id) on delete cascade,
  collected_amount numeric(12,2) not null default 0,
  paybox_url text,
  updated_by uuid references auth.users(id),
  updated_at timestamptz not null default now()
);

create table public.committee_expenses (
  id uuid primary key default gen_random_uuid(),
  kindergarten_id uuid not null references public.kindergartens(id) on delete cascade,
  description text not null,
  amount numeric(12,2) not null check(amount>=0),
  expense_date date not null,
  created_by uuid references auth.users(id),
  created_at timestamptz not null default now()
);

create table public.committee_initiatives (
  id uuid primary key default gen_random_uuid(),
  kindergarten_id uuid not null references public.kindergartens(id) on delete cascade,
  initiative_type text not null check(initiative_type in ('poll','treats','help')),
  title text not null,
  payload jsonb not null default '{}'::jsonb,
  active boolean not null default true,
  created_by uuid references auth.users(id),
  created_at timestamptz not null default now()
);

create table public.committee_responses (
  id uuid primary key default gen_random_uuid(),
  initiative_id uuid not null references public.committee_initiatives(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  response_key text not null,
  response_value text,
  unique(initiative_id,user_id,response_key)
);

create or replace function public.is_member(kid uuid) returns boolean language sql stable security definer set search_path=public as $$
  select exists(select 1 from public.memberships where kindergarten_id=kid and user_id=auth.uid() and approved=true);
$$;
create or replace function public.has_role(kid uuid, roles public.gan_role[]) returns boolean language sql stable security definer set search_path=public as $$
  select exists(select 1 from public.memberships where kindergarten_id=kid and user_id=auth.uid() and approved=true and role=any(roles));
$$;

alter table public.kindergartens enable row level security;
alter table public.memberships enable row level security;
alter table public.daily_updates enable row level security;
alter table public.calendar_events enable row level security;
alter table public.albums enable row level security;
alter table public.album_photos enable row level security;
alter table public.community_items enable row level security;
alter table public.community_responses enable row level security;
alter table public.committee_funds enable row level security;
alter table public.committee_expenses enable row level security;
alter table public.committee_initiatives enable row level security;
alter table public.committee_responses enable row level security;

create policy "members read kindergarten" on public.kindergartens for select using(public.is_member(id));
create policy "own membership" on public.memberships for select using(user_id=auth.uid());
create policy "admin manages memberships" on public.memberships for all using(public.has_role(kindergarten_id,array['admin']::public.gan_role[])) with check(public.has_role(kindergarten_id,array['admin']::public.gan_role[]));
create policy "members read daily" on public.daily_updates for select using(public.is_member(kindergarten_id));
create policy "staff manage daily" on public.daily_updates for all using(public.has_role(kindergarten_id,array['staff','admin']::public.gan_role[])) with check(public.has_role(kindergarten_id,array['staff','admin']::public.gan_role[]));
create policy "members read events" on public.calendar_events for select using(public.is_member(kindergarten_id));
create policy "staff manage events" on public.calendar_events for all using(public.has_role(kindergarten_id,array['staff','admin']::public.gan_role[])) with check(public.has_role(kindergarten_id,array['staff','admin']::public.gan_role[]));
create policy "members read albums" on public.albums for select using(public.is_member(kindergarten_id));
create policy "staff manage albums" on public.albums for all using(public.has_role(kindergarten_id,array['staff','admin']::public.gan_role[])) with check(public.has_role(kindergarten_id,array['staff','admin']::public.gan_role[]));
create policy "members read photos" on public.album_photos for select using(exists(select 1 from public.albums a where a.id=album_id and public.is_member(a.kindergarten_id)));
create policy "members read community" on public.community_items for select using(public.is_member(kindergarten_id));
create policy "members create community" on public.community_items for insert with check(public.is_member(kindergarten_id) and created_by=auth.uid());
create policy "creator updates community" on public.community_items for update using(created_by=auth.uid()) with check(created_by=auth.uid());
create policy "members respond" on public.community_responses for insert with check(responder_id=auth.uid());
create policy "members read fund" on public.committee_funds for select using(public.is_member(kindergarten_id));
create policy "committee manages fund" on public.committee_funds for all using(public.has_role(kindergarten_id,array['committee','admin']::public.gan_role[])) with check(public.has_role(kindergarten_id,array['committee','admin']::public.gan_role[]));
create policy "members read expenses" on public.committee_expenses for select using(public.is_member(kindergarten_id));
create policy "committee manages expenses" on public.committee_expenses for all using(public.has_role(kindergarten_id,array['committee','admin']::public.gan_role[])) with check(public.has_role(kindergarten_id,array['committee','admin']::public.gan_role[]));
create policy "members read initiatives" on public.committee_initiatives for select using(active and public.is_member(kindergarten_id));
create policy "committee manages initiatives" on public.committee_initiatives for all using(public.has_role(kindergarten_id,array['committee','admin']::public.gan_role[])) with check(public.has_role(kindergarten_id,array['committee','admin']::public.gan_role[]));
create policy "own committee responses" on public.committee_responses for all using(user_id=auth.uid()) with check(user_id=auth.uid());

insert into public.kindergartens(name,slug) values('גן מזור','gan-mazor') on conflict(slug) do nothing;
-- יש ליצור bucket פרטי בשם gan-albums. אין להפוך אותו לציבורי.
