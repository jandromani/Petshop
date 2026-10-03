alter table canonical_hotels
  add column if not exists region text;

alter table offer_snapshots
  add column if not exists room_type text,
  add column if not exists taxes_included boolean,
  add column if not exists fulfillment_type text not null default 'REDIRECT';

create table if not exists shared_plans (
  id text primary key,
  monthly_budget integer not null,
  party text not null,
  duration_days integer not null,
  mode text not null,
  check_in date not null,
  flexible_days integer not null default 0,
  created_at timestamptz not null default now(),
  expires_at timestamptz not null default (now()+interval '90 days')
);

create table if not exists rate_limit_buckets (
  bucket_key text primary key,
  window_started_at timestamptz not null,
  hits integer not null default 0,
  updated_at timestamptz not null default now()
);

create index if not exists canonical_hotels_region on canonical_hotels(region);
create index if not exists shared_plans_expiry on shared_plans(expires_at);
