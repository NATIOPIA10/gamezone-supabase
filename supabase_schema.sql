-- ============================================================
-- GAME ZONE MANAGEMENT SYSTEM — SUPABASE SCHEMA
-- Run this entire file in your Supabase SQL Editor
-- ============================================================

-- ─── EXTENSIONS ─────────────────────────────────────────────
create extension if not exists "uuid-ossp";

-- ─── ENUMS ──────────────────────────────────────────────────
create type user_role as enum ('superadmin', 'owner', 'staff');
create type account_status as enum ('active', 'suspended', 'pending');
create type zone_status as enum ('active', 'inactive');
create type plan_name as enum ('Basic', 'Pro', 'Premium');
create type session_status as enum ('active', 'ended');
create type payment_method as enum ('cash', 'card', 'online');
create type notification_type as enum ('info', 'warning', 'success', 'error');

-- ─── PROFILES TABLE ─────────────────────────────────────────
-- Extends Supabase auth.users
create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  name text not null,
  email text not null unique,
  role user_role not null default 'staff',
  status account_status not null default 'pending',
  zone_id uuid, -- linked later via FK
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- ─── GAME ZONES TABLE ───────────────────────────────────────
create table public.game_zones (
  id uuid primary key default uuid_generate_v4(),
  name text not null,
  location text not null,
  owner_id uuid references public.profiles(id) on delete set null,
  status zone_status not null default 'active',
  plan plan_name not null default 'Basic',
  max_stations integer not null default 10,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Add FK from profiles to game_zones
alter table public.profiles
  add constraint profiles_zone_id_fkey
  foreign key (zone_id) references public.game_zones(id) on delete set null;

-- ─── SUBSCRIPTION PLANS TABLE ───────────────────────────────
create table public.subscription_plans (
  id uuid primary key default uuid_generate_v4(),
  name plan_name not null unique,
  price_monthly numeric(10,2) not null,
  max_stations integer not null,
  features jsonb not null default '[]',
  is_active boolean default true,
  created_at timestamptz default now()
);

-- ─── SUBSCRIPTIONS TABLE ────────────────────────────────────
create table public.subscriptions (
  id uuid primary key default uuid_generate_v4(),
  zone_id uuid not null references public.game_zones(id) on delete cascade,
  plan_id uuid not null references public.subscription_plans(id),
  owner_id uuid not null references public.profiles(id) on delete cascade,
  status account_status default 'active',
  started_at timestamptz default now(),
  expires_at timestamptz default (now() + interval '30 days'),
  created_at timestamptz default now()
);

-- ─── PLAYERS TABLE ──────────────────────────────────────────
create table public.players (
  id uuid primary key default uuid_generate_v4(),
  name text not null,
  email text unique,
  phone text,
  zone_id uuid references public.game_zones(id) on delete set null,
  registered_by uuid references public.profiles(id) on delete set null,
  status account_status default 'active',
  total_sessions integer default 0,
  total_spent numeric(10,2) default 0,
  last_seen timestamptz,
  created_at timestamptz default now()
);

-- ─── SESSIONS TABLE ─────────────────────────────────────────
create table public.sessions (
  id uuid primary key default uuid_generate_v4(),
  player_id uuid not null references public.players(id) on delete cascade,
  zone_id uuid not null references public.game_zones(id) on delete cascade,
  station_number integer not null,
  started_by uuid references public.profiles(id),
  ended_by uuid references public.profiles(id),
  started_at timestamptz default now(),
  ended_at timestamptz,
  duration_minutes integer,
  amount_charged numeric(10,2) default 0,
  status session_status default 'active'
);

-- ─── PAYMENTS TABLE ─────────────────────────────────────────
create table public.payments (
  id uuid primary key default uuid_generate_v4(),
  session_id uuid references public.sessions(id) on delete set null,
  player_id uuid references public.players(id) on delete set null,
  zone_id uuid references public.game_zones(id) on delete set null,
  amount numeric(10,2) not null,
  method payment_method default 'cash',
  processed_by uuid references public.profiles(id),
  created_at timestamptz default now()
);

-- ─── NOTIFICATIONS TABLE ────────────────────────────────────
create table public.notifications (
  id uuid primary key default uuid_generate_v4(),
  title text not null,
  message text not null,
  type notification_type default 'info',
  sent_by uuid references public.profiles(id),
  target_zone_id uuid references public.game_zones(id) on delete cascade,
  -- null target_zone_id = broadcast to all
  created_at timestamptz default now()
);

-- ─── NOTIFICATION READS TABLE ───────────────────────────────
create table public.notification_reads (
  id uuid primary key default uuid_generate_v4(),
  notification_id uuid references public.notifications(id) on delete cascade,
  user_id uuid references public.profiles(id) on delete cascade,
  read_at timestamptz default now(),
  unique(notification_id, user_id)
);

-- ─── REPORTS / ANALYTICS VIEW ───────────────────────────────
create view public.zone_analytics as
select
  gz.id as zone_id,
  gz.name as zone_name,
  gz.location,
  gz.status,
  gz.plan,
  count(distinct p.id) as total_players,
  count(distinct s.id) as total_sessions,
  coalesce(sum(pay.amount), 0) as total_revenue,
  count(distinct s.id) filter (where s.status = 'active') as active_sessions
from public.game_zones gz
left join public.players p on p.zone_id = gz.id
left join public.sessions s on s.zone_id = gz.id
left join public.payments pay on pay.zone_id = gz.id
group by gz.id;

-- ─── MONTHLY REVENUE VIEW ───────────────────────────────────
create view public.monthly_revenue as
select
  zone_id,
  date_trunc('month', created_at) as month,
  sum(amount) as revenue,
  count(*) as transactions
from public.payments
group by zone_id, date_trunc('month', created_at)
order by month desc;

-- ─── UPDATED_AT TRIGGER ─────────────────────────────────────
create or replace function update_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

create trigger trg_profiles_updated_at
  before update on public.profiles
  for each row execute function update_updated_at();

create trigger trg_zones_updated_at
  before update on public.game_zones
  for each row execute function update_updated_at();

-- ─── AUTO-HANDLE SESSION STATS ──────────────────────────────
create or replace function update_player_stats()
returns trigger as $$
begin
  if new.status = 'ended' and old.status = 'active' then
    update public.players
    set
      total_sessions = total_sessions + 1,
      last_seen = now()
    where id = new.player_id;
  end if;
  return new;
end;
$$ language plpgsql;

create trigger trg_session_ended
  after update on public.sessions
  for each row execute function update_player_stats();

-- ─── AUTO-UPDATE PLAYER SPENDING ────────────────────────────
create or replace function update_player_spending()
returns trigger as $$
begin
  update public.players
  set total_spent = total_spent + new.amount
  where id = new.player_id;
  return new;
end;
$$ language plpgsql;

create trigger trg_payment_inserted
  after insert on public.payments
  for each row execute function update_player_spending();

-- ─── AUTO-CREATE PROFILE ON AUTH SIGNUP ─────────────────────
create or replace function handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, email, name, role, status)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data->>'name', split_part(new.email, '@', 1)),
    coalesce((new.raw_user_meta_data->>'role')::user_role, 'staff'),
    'pending'
  );
  return new;
end;
$$ language plpgsql security definer;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function handle_new_user();

-- ═══════════════════════════════════════════════════════════
-- ROW LEVEL SECURITY (RLS)
-- ═══════════════════════════════════════════════════════════

-- Enable RLS on all tables
alter table public.profiles enable row level security;
alter table public.game_zones enable row level security;
alter table public.players enable row level security;
alter table public.sessions enable row level security;
alter table public.payments enable row level security;
alter table public.notifications enable row level security;
alter table public.notification_reads enable row level security;
alter table public.subscriptions enable row level security;
alter table public.subscription_plans enable row level security;

-- ─── HELPER: get current user role ──────────────────────────
create or replace function get_my_role()
returns user_role as $$
  select role from public.profiles where id = auth.uid();
$$ language sql security definer stable;

create or replace function get_my_zone_id()
returns uuid as $$
  select zone_id from public.profiles where id = auth.uid();
$$ language sql security definer stable;

create or replace function get_my_status()
returns account_status as $$
  select status from public.profiles where id = auth.uid();
$$ language sql security definer stable;

-- ─── PROFILES POLICIES ──────────────────────────────────────
-- Users can read their own profile
create policy "profiles_self_read" on public.profiles
  for select using (id = auth.uid());

-- Superadmin can read all profiles
create policy "profiles_superadmin_read" on public.profiles
  for select using (get_my_role() = 'superadmin');

-- Owners can read staff in their zone
create policy "profiles_owner_read_staff" on public.profiles
  for select using (
    get_my_role() = 'owner' and zone_id = get_my_zone_id()
  );

-- Only superadmin can insert/update/delete profiles
create policy "profiles_superadmin_write" on public.profiles
  for all using (get_my_role() = 'superadmin');

-- Users can update their own non-sensitive fields
create policy "profiles_self_update" on public.profiles
  for update using (id = auth.uid())
  with check (id = auth.uid());

-- ─── GAME ZONES POLICIES ────────────────────────────────────
-- Superadmin: full access
create policy "zones_superadmin_all" on public.game_zones
  for all using (get_my_role() = 'superadmin');

-- Owner: read their own zone
create policy "zones_owner_read" on public.game_zones
  for select using (
    get_my_role() = 'owner' and id = get_my_zone_id()
  );

-- Owner: update their own zone (limited fields enforced in app)
create policy "zones_owner_update" on public.game_zones
  for update using (
    get_my_role() = 'owner' and id = get_my_zone_id()
  );

-- Staff: read their own zone
create policy "zones_staff_read" on public.game_zones
  for select using (
    get_my_role() = 'staff' and id = get_my_zone_id()
  );

-- ─── PLAYERS POLICIES ───────────────────────────────────────
create policy "players_superadmin_all" on public.players
  for all using (get_my_role() = 'superadmin');

create policy "players_owner_zone" on public.players
  for all using (
    get_my_role() = 'owner' and zone_id = get_my_zone_id()
  );

create policy "players_staff_zone" on public.players
  for all using (
    get_my_role() = 'staff' and zone_id = get_my_zone_id()
  );

-- ─── SESSIONS POLICIES ──────────────────────────────────────
create policy "sessions_superadmin_all" on public.sessions
  for all using (get_my_role() = 'superadmin');

create policy "sessions_owner_zone" on public.sessions
  for all using (
    get_my_role() = 'owner' and zone_id = get_my_zone_id()
  );

create policy "sessions_staff_zone" on public.sessions
  for all using (
    get_my_role() = 'staff' and zone_id = get_my_zone_id()
  );

-- ─── PAYMENTS POLICIES ──────────────────────────────────────
create policy "payments_superadmin_all" on public.payments
  for all using (get_my_role() = 'superadmin');

create policy "payments_owner_zone" on public.payments
  for all using (
    get_my_role() = 'owner' and zone_id = get_my_zone_id()
  );

-- Staff can insert payments but only read their own zone's
create policy "payments_staff_zone" on public.payments
  for all using (
    get_my_role() = 'staff' and zone_id = get_my_zone_id()
  );

-- ─── NOTIFICATIONS POLICIES ─────────────────────────────────
create policy "notifications_superadmin_all" on public.notifications
  for all using (get_my_role() = 'superadmin');

-- All active users can read notifications for their zone or broadcasts
create policy "notifications_users_read" on public.notifications
  for select using (
    get_my_status() = 'active' and (
      target_zone_id is null or
      target_zone_id = get_my_zone_id()
    )
  );

-- ─── NOTIFICATION READS POLICIES ────────────────────────────
create policy "notif_reads_own" on public.notification_reads
  for all using (user_id = auth.uid());

-- ─── SUBSCRIPTIONS POLICIES ─────────────────────────────────
create policy "subs_superadmin_all" on public.subscriptions
  for all using (get_my_role() = 'superadmin');

create policy "subs_owner_read" on public.subscriptions
  for select using (
    get_my_role() = 'owner' and owner_id = auth.uid()
  );

-- ─── SUBSCRIPTION PLANS POLICIES ────────────────────────────
-- Everyone can read plans
create policy "plans_read_all" on public.subscription_plans
  for select using (true);

-- Only superadmin can modify
create policy "plans_superadmin_write" on public.subscription_plans
  for all using (get_my_role() = 'superadmin');

-- ═══════════════════════════════════════════════════════════
-- SEED DATA
-- ═══════════════════════════════════════════════════════════

-- Subscription Plans
insert into public.subscription_plans (name, price_monthly, max_stations, features) values
  ('Basic',   99.00,  10,  '["Player tracking", "Basic reports", "Email support"]'),
  ('Pro',     249.00, 25,  '["Advanced analytics", "Multi-staff accounts", "Priority support", "Custom branding"]'),
  ('Premium', 499.00, 999, '["Unlimited stations", "API access", "Dedicated account manager", "White-label option"]');

-- NOTE: To create a superadmin account:
-- 1. Register via Supabase Auth (or the app registration page)
-- 2. Then run this to elevate the account:
--    UPDATE public.profiles SET role = 'superadmin', status = 'active' WHERE email = 'your@email.com';
