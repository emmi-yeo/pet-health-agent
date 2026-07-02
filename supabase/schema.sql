-- Pet Health Journal Agent — Supabase Schema
-- Run this in your Supabase SQL Editor

-- Enable UUID extension
create extension if not exists "uuid-ossp";

-- Pets table
create table public.pets (
  id uuid default uuid_generate_v4() primary key,
  user_id uuid references auth.users(id) on delete cascade not null,
  name text not null,
  species text not null,       -- dog, cat, rabbit, etc.
  breed text,
  age_years numeric(4,1),
  weight_kg numeric(5,2),
  color text,
  microchip_id text,
  created_at timestamptz default now() not null,
  updated_at timestamptz default now() not null
);

-- Health logs table
create table public.health_logs (
  id uuid default uuid_generate_v4() primary key,
  pet_id uuid references public.pets(id) on delete cascade not null,
  user_id uuid references auth.users(id) on delete cascade not null,
  logged_at timestamptz default now() not null,
  raw_input text not null,             -- what the user typed
  extracted_symptoms text[],           -- agent-extracted symptom list
  extracted_behaviors text[],          -- agent-extracted behavior changes
  extracted_mood text,                 -- happy, lethargic, anxious, etc.
  flagged boolean default false,       -- analysis agent flagged this
  flag_reason text,                    -- why it was flagged
  severity text check (severity in ('low', 'medium', 'high')),
  created_at timestamptz default now() not null
);

-- Medications table
create table public.medications (
  id uuid default uuid_generate_v4() primary key,
  pet_id uuid references public.pets(id) on delete cascade not null,
  user_id uuid references auth.users(id) on delete cascade not null,
  name text not null,
  dose text,                           -- e.g. "10mg"
  frequency text,                      -- e.g. "once daily"
  start_date date,
  end_date date,
  notes text,
  active boolean default true,
  created_at timestamptz default now() not null
);

-- Vet visits table
create table public.vet_visits (
  id uuid default uuid_generate_v4() primary key,
  pet_id uuid references public.pets(id) on delete cascade not null,
  user_id uuid references auth.users(id) on delete cascade not null,
  visit_date date not null,
  vet_name text,
  clinic_name text,
  reason text,
  notes text,
  created_at timestamptz default now() not null
);

-- Vet summaries (agent-generated)
create table public.vet_summaries (
  id uuid default uuid_generate_v4() primary key,
  pet_id uuid references public.pets(id) on delete cascade not null,
  user_id uuid references auth.users(id) on delete cascade not null,
  generated_at timestamptz default now() not null,
  date_range_start date,
  date_range_end date,
  content text not null,               -- full generated summary
  key_concerns text[],                 -- extracted concern list
  recommended_questions text[]         -- questions to ask the vet
);

-- Row Level Security
alter table public.pets enable row level security;
alter table public.health_logs enable row level security;
alter table public.medications enable row level security;
alter table public.vet_visits enable row level security;
alter table public.vet_summaries enable row level security;

-- RLS Policies — users can only access their own data
create policy "Users can manage their own pets"
  on public.pets for all using (auth.uid() = user_id);

create policy "Users can manage their own health logs"
  on public.health_logs for all using (auth.uid() = user_id);

create policy "Users can manage their own medications"
  on public.medications for all using (auth.uid() = user_id);

create policy "Users can manage their own vet visits"
  on public.vet_visits for all using (auth.uid() = user_id);

create policy "Users can manage their own vet summaries"
  on public.vet_summaries for all using (auth.uid() = user_id);

-- Auto-update updated_at on pets
create or replace function public.handle_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

create trigger pets_updated_at
  before update on public.pets
  for each row execute procedure public.handle_updated_at();
