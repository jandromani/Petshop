alter table hotel_content
  add column if not exists display_allowed boolean not null default false,
  add column if not exists license_ref text,
  add column if not exists source_url text,
  add column if not exists fetched_at timestamptz not null default now(),
  add column if not exists expires_at timestamptz;

create index if not exists idx_hotel_content_displayable
  on hotel_content(display_allowed,expires_at,updated_at desc);

create table if not exists consumer_rate_alerts (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null references consumer_profiles(id) on delete cascade,
  hotel_id text not null,
  hotel_name text not null,
  city text not null,
  country text not null,
  check_in date not null,
  nights integer not null check (nights between 30 and 365),
  occupancy integer not null check (occupancy between 1 and 2),
  target_monthly numeric(12,2),
  currency text not null default 'EUR',
  status text not null default 'ACTIVE' check (status in ('ACTIVE','TRIGGERED','PAUSED')),
  triggered_offer_id text,
  triggered_monthly numeric(12,2),
  triggered_at timestamptz,
  last_checked_at timestamptz,
  last_result text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(profile_id,hotel_id,check_in,nights,occupancy)
);

create index if not exists idx_consumer_rate_alerts_active
  on consumer_rate_alerts(status,last_checked_at nulls first,created_at)
  where status='ACTIVE';

create index if not exists idx_consumer_rate_alerts_profile
  on consumer_rate_alerts(profile_id,updated_at desc);
