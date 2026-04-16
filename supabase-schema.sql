-- ============================================================
-- PawPal Supabase Schema
-- Paste into Supabase Studio → SQL Editor → Run
-- ============================================================

create extension if not exists "uuid-ossp";

-- ── profiles ────────────────────────────────────────────────
create table if not exists public.profiles (
  id          uuid primary key references auth.users(id) on delete cascade,
  full_name   text,
  avatar_url  text,
  role        text not null default 'owner'
                check (role in ('owner','vet','shelter_admin','superadmin')),
  phone       text,
  city        text,
  created_at  timestamptz not null default now()
);
alter table public.profiles enable row level security;
create policy "profiles: public read"   on public.profiles for select using (true);
create policy "profiles: owner update"  on public.profiles for update using (auth.uid() = id);
create policy "profiles: owner insert"  on public.profiles for insert with check (auth.uid() = id);

-- Auto-create profile on signup
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer as $$
begin
  insert into public.profiles (id, full_name, role)
  values (new.id, coalesce(new.raw_user_meta_data->>'full_name',''), 'owner')
  on conflict (id) do nothing;
  return new;
end;$$;
drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- ── pets ─────────────────────────────────────────────────────
create table if not exists public.pets (
  id         uuid primary key default uuid_generate_v4(),
  owner_id   uuid not null references public.profiles(id) on delete cascade,
  name       text not null,
  species    text not null check (species in ('dog','cat','bird','rabbit','other')),
  breed      text,
  dob        date,
  gender     text check (gender in ('male','female')),
  photo_url  text,
  notes      text,
  created_at timestamptz not null default now()
);
alter table public.pets enable row level security;
create policy "pets: owner crud" on public.pets for all using (auth.uid() = owner_id);
create policy "pets: vet read"   on public.pets for select using (
  exists (select 1 from public.profiles where id = auth.uid() and role in ('vet','shelter_admin','superadmin'))
);

-- ── health_vaccinations ──────────────────────────────────────
create table if not exists public.health_vaccinations (
  id              uuid primary key default uuid_generate_v4(),
  pet_id          uuid not null references public.pets(id) on delete cascade,
  vaccine_name    text not null,
  administered_on date not null,
  next_due_on     date,
  vet_id          uuid references public.profiles(id),
  notes           text
);
alter table public.health_vaccinations enable row level security;
create policy "vaccinations: owner crud" on public.health_vaccinations for all using (
  exists (select 1 from public.pets where id = pet_id and owner_id = auth.uid())
);

-- ── health_medications ───────────────────────────────────────
create table if not exists public.health_medications (
  id                uuid primary key default uuid_generate_v4(),
  pet_id            uuid not null references public.pets(id) on delete cascade,
  medication_name   text not null,
  dosage            text,
  frequency         text,
  start_date        date not null,
  end_date          date,
  prescribed_by     uuid references public.profiles(id)
);
alter table public.health_medications enable row level security;
create policy "medications: owner crud" on public.health_medications for all using (
  exists (select 1 from public.pets where id = pet_id and owner_id = auth.uid())
);

-- ── health_weight_logs ───────────────────────────────────────
create table if not exists public.health_weight_logs (
  id         uuid primary key default uuid_generate_v4(),
  pet_id     uuid not null references public.pets(id) on delete cascade,
  weight_kg  numeric(5,2) not null check (weight_kg > 0),
  logged_on  date not null,
  notes      text
);
alter table public.health_weight_logs enable row level security;
create policy "weight: owner crud" on public.health_weight_logs for all using (
  exists (select 1 from public.pets where id = pet_id and owner_id = auth.uid())
);

-- ── vets ─────────────────────────────────────────────────────
create table if not exists public.vets (
  id               uuid primary key references public.profiles(id) on delete cascade,
  clinic_name      text not null,
  specializations  text[] not null default '{}',
  city             text,
  address          text,
  lat              numeric(9,6),
  lng              numeric(9,6),
  avg_rating       numeric(3,2) default 0,
  availability     jsonb
);
alter table public.vets enable row level security;
create policy "vets: public read"  on public.vets for select using (true);
create policy "vets: self manage"  on public.vets for all using (auth.uid() = id);

-- ── appointments ─────────────────────────────────────────────
create table if not exists public.appointments (
  id                uuid primary key default uuid_generate_v4(),
  vet_id            uuid not null references public.vets(id) on delete cascade,
  owner_id          uuid not null references public.profiles(id) on delete cascade,
  pet_id            uuid not null references public.pets(id) on delete cascade,
  scheduled_at      timestamptz not null,
  status            text not null default 'confirmed'
                      check (status in ('confirmed','completed','cancelled','no_show')),
  prescription_url  text,
  clinical_notes    text
);
alter table public.appointments enable row level security;
create policy "appointments: owner"  on public.appointments for all using (auth.uid() = owner_id);
create policy "appointments: vet"    on public.appointments for all using (auth.uid() = vet_id);

-- ── adoption_listings ────────────────────────────────────────
create table if not exists public.adoption_listings (
  id          uuid primary key default uuid_generate_v4(),
  pet_id      uuid not null references public.pets(id) on delete cascade,
  shelter_id  uuid not null references public.profiles(id) on delete cascade,
  status      text not null default 'available'
                check (status in ('available','pending','adopted')),
  description text,
  city        text,
  listed_at   timestamptz not null default now()
);
alter table public.adoption_listings enable row level security;
create policy "listings: public read"    on public.adoption_listings for select using (true);
create policy "listings: shelter manage" on public.adoption_listings for all using (auth.uid() = shelter_id);

-- ── adoption_applications ────────────────────────────────────
create table if not exists public.adoption_applications (
  id            uuid primary key default uuid_generate_v4(),
  listing_id    uuid not null references public.adoption_listings(id) on delete cascade,
  applicant_id  uuid not null references public.profiles(id) on delete cascade,
  status        text not null default 'pending'
                  check (status in ('pending','approved','rejected')),
  statement     text,
  applied_at    timestamptz not null default now(),
  unique(listing_id, applicant_id)
);
alter table public.adoption_applications enable row level security;
create policy "applications: applicant"  on public.adoption_applications for all using (auth.uid() = applicant_id);
create policy "applications: shelter read" on public.adoption_applications for select using (
  exists (select 1 from public.adoption_listings l where l.id = listing_id and l.shelter_id = auth.uid())
);

-- ── messages ─────────────────────────────────────────────────
create table if not exists public.messages (
  id          uuid primary key default uuid_generate_v4(),
  channel_id  text not null,
  sender_id   uuid not null references public.profiles(id) on delete cascade,
  content     text not null,
  media_url   text,
  type        text not null default 'text' check (type in ('text','image','system')),
  sent_at     timestamptz not null default now()
);
create index if not exists messages_channel_idx on public.messages(channel_id, sent_at);
alter table public.messages enable row level security;
create policy "messages: auth read"   on public.messages for select using (auth.role() = 'authenticated');
create policy "messages: auth insert" on public.messages for insert with check (auth.uid() = sender_id);

-- ── Storage Buckets ──────────────────────────────────────────
insert into storage.buckets (id, name, public) values
  ('pet-photos',    'pet-photos',    true),
  ('avatars',       'avatars',       true),
  ('prescriptions', 'prescriptions', false)
on conflict (id) do nothing;

create policy "pet-photos: public read"   on storage.objects for select using (bucket_id = 'pet-photos');
create policy "pet-photos: auth upload"   on storage.objects for insert with check (bucket_id = 'pet-photos' and auth.role() = 'authenticated');
create policy "avatars: public read"      on storage.objects for select using (bucket_id = 'avatars');
create policy "avatars: auth upload"      on storage.objects for insert with check (bucket_id = 'avatars' and auth.role() = 'authenticated');

-- Enable Realtime on messages (also do this in Dashboard → Database → Replication)
-- alter publication supabase_realtime add table public.messages;

-- ── Sample Vets (optional) ───────────────────────────────────
-- First create a user in Auth, then replace the UUID:
-- insert into public.vets (id, clinic_name, specializations, city, address, avg_rating)
-- values ('your-auth-user-uuid', 'PawCare Clinic', '{dogs,cats}', 'Mumbai', 'Bandra West', 4.5);
