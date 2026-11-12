-- Poliba Corse · Cost & Emissions
-- Schema del registro costi ed emissioni (monoposto in sviluppo).
-- Da eseguire una volta sola nell'SQL Editor di Supabase.

create extension if not exists pgcrypto;

-- ---------------------------------------------------------------- tipi
do $$ begin
  create type public.review_status as enum ('bozza', 'verificato');
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.sourcing_type as enum ('make', 'buy');
exception when duplicate_object then null; end $$;

-- ------------------------------------------------------------- tabelle
create table if not exists public.systems (
  id         uuid primary key default gen_random_uuid(),
  code       text not null unique,
  name       text not null unique,
  sort_order int  not null default 0
);

create table if not exists public.teams (
  id         uuid primary key default gen_random_uuid(),
  slug       text not null unique,
  name       text not null unique,
  sort_order int  not null default 0
);

create table if not exists public.profiles (
  id         uuid primary key references auth.users(id) on delete cascade,
  email      text not null,
  team_id    uuid references public.teams(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.assemblies (
  id               uuid primary key default gen_random_uuid(),
  name             text not null,
  system_id        uuid not null references public.systems(id) on delete restrict,
  team_id          uuid not null references public.teams(id) on delete restrict,
  status           public.review_status not null default 'bozza',
  notes            text,
  created_by       uuid references auth.users(id) on delete set null,
  updated_by       uuid references auth.users(id) on delete set null,
  created_by_email text,
  updated_by_email text,
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now(),
  unique (name, system_id)
);

create table if not exists public.components (
  id               uuid primary key default gen_random_uuid(),
  assembly_id      uuid not null references public.assemblies(id) on delete cascade,
  code             text,
  description      text not null,
  quantity         numeric(12,3) not null default 1 check (quantity >= 0),
  unit_cost        numeric(12,2) not null default 0 check (unit_cost >= 0),
  material         text,
  mass_kg          numeric(12,4) check (mass_kg is null or mass_kg >= 0),
  process          text,
  sourcing         public.sourcing_type,
  supplier         text,
  co2e_unit        numeric(12,4) not null default 0 check (co2e_unit >= 0),
  co2e_source      text,
  notes            text,
  status           public.review_status not null default 'bozza',
  cost_total       numeric(14,4) generated always as (quantity * unit_cost) stored,
  co2e_total       numeric(14,4) generated always as (quantity * co2e_unit) stored,
  created_by       uuid references auth.users(id) on delete set null,
  updated_by       uuid references auth.users(id) on delete set null,
  created_by_email text,
  updated_by_email text,
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now()
);

create index if not exists components_assembly_idx on public.components(assembly_id);
create index if not exists assemblies_system_idx on public.assemblies(system_id);
create index if not exists assemblies_team_idx on public.assemblies(team_id);

-- ------------------------------------------------------------ trigger
-- Aggiorna updated_at/updated_by e riporta a "bozza" un dato verificato
-- che viene modificato nel contenuto.
create or replace function public.touch_review()
returns trigger
language plpgsql
as $$
declare
  new_payload jsonb;
  old_payload jsonb;
begin
  new.updated_at := now();
  if auth.uid() is not null then
    new.updated_by := auth.uid();
  end if;

  if tg_op = 'UPDATE' then
    if old.status = 'verificato' and new.status = 'verificato' then
      new_payload := to_jsonb(new) - 'status' - 'updated_at' - 'updated_by' - 'updated_by_email';
      old_payload := to_jsonb(old) - 'status' - 'updated_at' - 'updated_by' - 'updated_by_email';
      if new_payload <> old_payload then
        new.status := 'bozza';
      end if;
    end if;
  end if;

  return new;
end $$;

drop trigger if exists assemblies_touch on public.assemblies;
create trigger assemblies_touch before insert or update on public.assemblies
for each row execute function public.touch_review();

drop trigger if exists components_touch on public.components;
create trigger components_touch before insert or update on public.components
for each row execute function public.touch_review();

-- Profilo creato automaticamente alla registrazione.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, email)
  values (new.id, coalesce(new.email, ''))
  on conflict (id) do nothing;
  return new;
end $$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created after insert on auth.users
for each row execute function public.handle_new_user();

-- ---------------------------------------------------------------- RLS
alter table public.systems    enable row level security;
alter table public.teams      enable row level security;
alter table public.profiles   enable row level security;
alter table public.assemblies enable row level security;
alter table public.components enable row level security;

-- Lettura pubblica: chiunque abbia il link consulta i dati.
drop policy if exists systems_read on public.systems;
create policy systems_read on public.systems for select using (true);

drop policy if exists teams_read on public.teams;
create policy teams_read on public.teams for select using (true);

drop policy if exists assemblies_read on public.assemblies;
create policy assemblies_read on public.assemblies for select using (true);

drop policy if exists components_read on public.components;
create policy components_read on public.components for select using (true);

-- Scrittura: qualsiasi utente autenticato, su qualsiasi team.
drop policy if exists assemblies_insert on public.assemblies;
create policy assemblies_insert on public.assemblies for insert to authenticated with check (true);
drop policy if exists assemblies_update on public.assemblies;
create policy assemblies_update on public.assemblies for update to authenticated using (true) with check (true);
drop policy if exists assemblies_delete on public.assemblies;
create policy assemblies_delete on public.assemblies for delete to authenticated using (true);

drop policy if exists components_insert on public.components;
create policy components_insert on public.components for insert to authenticated with check (true);
drop policy if exists components_update on public.components;
create policy components_update on public.components for update to authenticated using (true) with check (true);
drop policy if exists components_delete on public.components;
create policy components_delete on public.components for delete to authenticated using (true);

-- Il profilo è leggibile e modificabile solo dal proprietario.
drop policy if exists profiles_self_read on public.profiles;
create policy profiles_self_read on public.profiles for select to authenticated using (auth.uid() = id);
drop policy if exists profiles_self_insert on public.profiles;
create policy profiles_self_insert on public.profiles for insert to authenticated with check (auth.uid() = id);
drop policy if exists profiles_self_update on public.profiles;
create policy profiles_self_update on public.profiles for update to authenticated using (auth.uid() = id) with check (auth.uid() = id);

-- ---------------------------------------------------------------- dati
insert into public.systems (code, name, sort_order) values
  ('FRM', 'Frame & Body',        1),
  ('SUS', 'Suspension',          2),
  ('STR', 'Steering',            3),
  ('BRK', 'Brakes',              4),
  ('EDP', 'Engine & Drivetrain', 5),
  ('ELC', 'Electrical',          6),
  ('AER', 'Aerodynamics',        7),
  ('MSC', 'Misc & Finish',       8)
on conflict (code) do nothing;

insert into public.teams (slug, name, sort_order) values
  ('aerodynamics',    'Aerodynamics',          1),
  ('vehicle-dynamics','Vehicle Dynamics',      2),
  ('drivetrain',      'Drivetrain',            3),
  ('cooling',         'Cooling System',        4),
  ('chassis',         'Chassis',               5),
  ('e-powertrain',    'E-Powertrain',          6),
  ('electronics',     'Electronics & Software',7),
  ('business',        'Business',              8),
  ('cost-management', 'Cost Management',       9)
on conflict (slug) do nothing;
