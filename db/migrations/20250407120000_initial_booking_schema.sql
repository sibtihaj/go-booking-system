-- Go Booking MVP: resources, bookable slots, reservations (one reservation per slot).
-- Go API uses a service-role or privileged DB connection; enforce row-level auth in application code.

create table if not exists public.resources (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  timezone text not null default 'UTC',
  created_at timestamptz not null default now()
);

create table if not exists public.slots (
  id uuid primary key default gen_random_uuid(),
  resource_id uuid not null references public.resources (id) on delete cascade,
  starts_at timestamptz not null,
  ends_at timestamptz not null,
  constraint slots_time_order check (ends_at > starts_at),
  constraint slots_resource_starts_unique unique (resource_id, starts_at)
);

create index if not exists slots_resource_starts_idx
  on public.slots (resource_id, starts_at);

create table if not exists public.reservations (
  id uuid primary key default gen_random_uuid(),
  slot_id uuid not null references public.slots (id) on delete restrict,
  user_id uuid not null references auth.users (id) on delete cascade,
  status text not null default 'confirmed'
    check (status in ('confirmed', 'cancelled')),
  created_at timestamptz not null default now(),
  constraint reservations_one_per_slot unique (slot_id)
);

create index if not exists reservations_user_id_idx
  on public.reservations (user_id);

comment on table public.resources is 'Bookable entity (room, staff, etc.).';
comment on table public.slots is 'Bookable time window; at most one confirmed reservation per slot enforced by reservations.slot_id uniqueness.';
comment on table public.reservations is 'User booking; Go API must set user_id from JWT sub.';
