-- farmer_details: stores farm-specific info for farmer profiles
create table if not exists public.farmer_details (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null references public.profiles(id) on delete cascade,
  farm_name text,
  farm_address text,
  farm_lat double precision,
  farm_lng double precision,
  land_area_acres numeric,
  capacity_kg_per_month numeric,
  compost_types text[] default '{}',
  notes text,
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  constraint farmer_details_profile_id_unique unique (profile_id)
);

-- updated_at trigger (reuse existing function)
create trigger set_farmer_details_updated_at
  before update on public.farmer_details
  for each row execute function update_updated_at();

-- RLS: admin-only full access
alter table public.farmer_details enable row level security;

create policy "Admin full access on farmer_details"
  on public.farmer_details
  for all
  using (public.get_user_role() = 'admin')
  with check (public.get_user_role() = 'admin');
