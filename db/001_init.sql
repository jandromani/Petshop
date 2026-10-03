-- Atlas/Petshop operational schema
create extension if not exists pgcrypto;

create table if not exists canonical_hotels (
  id uuid primary key default gen_random_uuid(),
  slug text unique not null,
  name text not null,
  city text not null,
  country text not null,
  lat double precision,
  lng double precision,
  silver_score integer,
  sellability_state text not null default 'DISCOVERED',
  confidence numeric(5,4) not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists provider_hotels (
  id uuid primary key default gen_random_uuid(),
  hotel_id uuid not null references canonical_hotels(id) on delete cascade,
  provider text not null,
  provider_hotel_id text not null,
  raw_hash text,
  last_seen_at timestamptz,
  last_verified_at timestamptz,
  status text not null default 'ACTIVE',
  unique(provider, provider_hotel_id)
);

create table if not exists acquisition_runs (
  id uuid primary key default gen_random_uuid(),
  wave_key text not null,
  provider text,
  region text,
  check_in date,
  duration_days integer,
  raw_count integer not null default 0,
  canonical_count integer not null default 0,
  quote_tested integer not null default 0,
  sellable_count integer not null default 0,
  stale_count integer not null default 0,
  quarantined_count integer not null default 0,
  status text not null default 'RUNNING',
  started_at timestamptz not null default now(),
  completed_at timestamptz
);

create table if not exists offer_snapshots (
  id uuid primary key default gen_random_uuid(),
  hotel_id uuid not null references canonical_hotels(id) on delete cascade,
  provider text not null,
  provider_offer_id text,
  check_in date not null,
  check_out date not null,
  occupancy integer not null default 1,
  board text,
  total_price numeric(12,2) not null,
  currency text not null,
  cancellation text,
  evidence jsonb not null default '{}'::jsonb,
  verified_at timestamptz not null default now(),
  expires_at timestamptz
);
create index if not exists offer_snapshots_lookup
  on offer_snapshots(hotel_id, check_in, check_out, verified_at desc);

create table if not exists referral_clicks (
  id uuid primary key default gen_random_uuid(),
  click_id text unique not null,
  visitor_id text,
  session_id text,
  hotel_id uuid references canonical_hotels(id),
  provider text not null,
  offer_snapshot_id uuid references offer_snapshots(id),
  source text,
  campaign text,
  page_path text,
  position integer,
  expected_commission numeric(12,2),
  created_at timestamptz not null default now()
);

create table if not exists conversions (
  id uuid primary key default gen_random_uuid(),
  click_id text references referral_clicks(click_id),
  provider text not null,
  provider_conversion_id text,
  booking_value numeric(12,2),
  commission numeric(12,2),
  currency text,
  status text not null default 'REPORTED',
  occurred_at timestamptz,
  received_at timestamptz not null default now(),
  unique(provider, provider_conversion_id)
);

create table if not exists growth_events (
  id uuid primary key default gen_random_uuid(),
  visitor_id text,
  session_id text,
  event_name text not null,
  properties jsonb not null default '{}'::jsonb,
  page_path text,
  created_at timestamptz not null default now()
);
create index if not exists growth_events_name_time on growth_events(event_name, created_at desc);

create table if not exists experiments (
  id uuid primary key default gen_random_uuid(),
  key text unique not null,
  hypothesis text not null,
  status text not null default 'DRAFT',
  variants jsonb not null default '[]'::jsonb,
  guardrails jsonb not null default '{}'::jsonb,
  started_at timestamptz,
  stopped_at timestamptz
);

create table if not exists agent_runs (
  id uuid primary key default gen_random_uuid(),
  agent_key text not null,
  objective text not null,
  model text,
  input jsonb not null default '{}'::jsonb,
  output jsonb,
  token_usage jsonb,
  estimated_cost_cents integer,
  status text not null default 'PENDING',
  started_at timestamptz not null default now(),
  completed_at timestamptz
);

create table if not exists judge_reviews (
  id uuid primary key default gen_random_uuid(),
  agent_run_id uuid references agent_runs(id) on delete cascade,
  judge_key text not null,
  verdict text not null,
  score numeric(5,2),
  reasons jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now()
);

create table if not exists seo_pages (
  id uuid primary key default gen_random_uuid(),
  path text unique not null,
  intent text not null,
  evidence jsonb not null default '{}'::jsonb,
  index_state text not null default 'NOINDEX',
  last_judged_at timestamptz,
  updated_at timestamptz not null default now()
);
