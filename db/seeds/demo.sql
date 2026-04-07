-- Demo data for local / staging. Safe to re-run: uses fixed resource id and conflict handling.
-- Matches default NEXT_PUBLIC_DEFAULT_RESOURCE_ID in apps/web/.env.example.

insert into public.resources (id, name, timezone)
values (
  'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
  'Demo room',
  'UTC'
)
on conflict (id) do nothing;

insert into public.slots (resource_id, starts_at, ends_at)
select
  'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
  v.starts_at,
  v.ends_at
from (
  values
    (now() + interval '1 day', now() + interval '1 day' + interval '1 hour'),
    (now() + interval '2 days', now() + interval '2 days' + interval '1 hour'),
    (now() + interval '3 days', now() + interval '3 days' + interval '1 hour')
) as v(starts_at, ends_at)
on conflict (resource_id, starts_at) do nothing;
