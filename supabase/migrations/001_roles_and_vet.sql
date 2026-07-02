-- profiles table
create table if not exists public.profiles (
  id uuid references auth.users(id) on delete cascade primary key,
  role text not null default 'owner' check (role in ('owner', 'vet')),
  full_name text,
  clinic_name text,
  license_number text,
  created_at timestamptz default now() not null
);
alter table public.profiles enable row level security;
create policy "Users manage own profile" on public.profiles for all using (auth.uid() = id);
create policy "Profiles readable by authenticated users" on public.profiles for select using (auth.uid() is not null);

-- trigger: auto-create profile on signup
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, full_name, role)
  values (
    new.id,
    new.raw_user_meta_data->>'full_name',
    coalesce(new.raw_user_meta_data->>'role', 'owner')
  )
  on conflict (id) do nothing;
  return new;
end;
$$ language plpgsql security definer;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- pet_shares
create table if not exists public.pet_shares (
  id uuid default uuid_generate_v4() primary key,
  pet_id uuid references public.pets(id) on delete cascade not null,
  vet_id uuid references auth.users(id) on delete cascade,
  owner_id uuid references auth.users(id) on delete cascade not null,
  vet_email text,
  status text not null default 'pending' check (status in ('pending', 'accepted', 'revoked')),
  invite_token uuid default uuid_generate_v4() unique not null,
  created_at timestamptz default now() not null
);
alter table public.pet_shares enable row level security;
create policy "Owners manage their pet shares" on public.pet_shares for all using (auth.uid() = owner_id);
create policy "Vets view shares assigned to them" on public.pet_shares for select using (auth.uid() = vet_id);

-- vet_notes
create table if not exists public.vet_notes (
  id uuid default uuid_generate_v4() primary key,
  pet_id uuid references public.pets(id) on delete cascade not null,
  vet_id uuid references auth.users(id) on delete cascade not null,
  log_id uuid references public.health_logs(id) on delete set null,
  content text not null,
  note_type text not null check (note_type in ('observation', 'diagnosis', 'treatment', 'followup')),
  created_at timestamptz default now() not null
);
alter table public.vet_notes enable row level security;
create policy "Vets manage their own notes" on public.vet_notes for all using (auth.uid() = vet_id);
create policy "Owners view notes on their pets" on public.vet_notes for select using (
  exists (select 1 from public.pets where pets.id = vet_notes.pet_id and pets.user_id = auth.uid())
);
create policy "Vets view notes on shared pets" on public.vet_notes for select using (
  exists (
    select 1 from public.pet_shares
    where pet_shares.pet_id = vet_notes.pet_id
    and pet_shares.vet_id = auth.uid()
    and pet_shares.status = 'accepted'
  )
);

-- appointments
create table if not exists public.appointments (
  id uuid default uuid_generate_v4() primary key,
  pet_id uuid references public.pets(id) on delete cascade not null,
  vet_id uuid references auth.users(id) on delete set null,
  owner_id uuid references auth.users(id) on delete cascade not null,
  scheduled_at timestamptz not null,
  notes text,
  status text not null default 'upcoming' check (status in ('upcoming', 'completed', 'cancelled')),
  created_at timestamptz default now() not null
);
alter table public.appointments enable row level security;
create policy "Owners manage their appointments" on public.appointments for all using (auth.uid() = owner_id);
create policy "Vets view appointments assigned to them" on public.appointments for select using (auth.uid() = vet_id);

-- Extend existing RLS: vets can read pets and logs for shared pets
create policy "Vets can view shared pets" on public.pets for select using (
  exists (
    select 1 from public.pet_shares
    where pet_shares.pet_id = pets.id
    and pet_shares.vet_id = auth.uid()
    and pet_shares.status = 'accepted'
  )
);
create policy "Vets can view logs for shared pets" on public.health_logs for select using (
  exists (
    select 1 from public.pet_shares
    where pet_shares.pet_id = health_logs.pet_id
    and pet_shares.vet_id = auth.uid()
    and pet_shares.status = 'accepted'
  )
);
create policy "Vets can view medications for shared pets" on public.medications for select using (
  exists (
    select 1 from public.pet_shares
    where pet_shares.pet_id = medications.pet_id
    and pet_shares.vet_id = auth.uid()
    and pet_shares.status = 'accepted'
  )
);
