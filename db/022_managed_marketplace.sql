alter table direct_rate_offers
  add column if not exists channel_model text not null default 'REFERRAL'
    check (channel_model in ('REFERRAL','MERCHANT','EXCLUSIVE_MERCHANT')),
  add column if not exists hotel_net_monthly numeric(12,2),
  add column if not exists merchant_enabled boolean not null default false,
  add column if not exists merchant_terms_verified boolean not null default false,
  add column if not exists inventory_units integer not null default 0 check (inventory_units >= 0),
  add column if not exists reserved_units integer not null default 0 check (reserved_units >= 0),
  add column if not exists sold_units integer not null default 0 check (sold_units >= 0);

create table if not exists merchant_orders (
  id uuid primary key default gen_random_uuid(),
  direct_rate_offer_id uuid not null references direct_rate_offers(id) on delete restrict,
  sourcing_request_id uuid references sourcing_requests(id) on delete set null,
  customer_email text not null,
  check_in date not null,
  nights integer not null check (nights in (30,60,90)),
  occupancy integer not null check (occupancy in (1,2)),
  currency text not null,
  customer_total numeric(12,2) not null,
  hotel_cost numeric(12,2) not null,
  platform_revenue numeric(12,2) not null,
  status text not null default 'CREATED'
    check (status in ('CREATED','CHECKOUT_CREATED','PAID','CONFIRMED','PAYMENT_FAILED','EXPIRED','CANCELLED','REFUNDED')),
  payment_provider text,
  checkout_session_id text unique,
  payment_intent_id text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  paid_at timestamptz,
  confirmed_at timestamptz,
  cancelled_at timestamptz
);

create index if not exists merchant_orders_status_created_idx
  on merchant_orders(status,created_at desc);

create table if not exists merchant_payment_events (
  event_id text primary key,
  event_type text not null,
  received_at timestamptz not null default now()
);

create table if not exists acquisition_spend (
  id uuid primary key default gen_random_uuid(),
  network text not null,
  campaign text,
  spend_date date not null,
  currency text not null default 'EUR',
  amount numeric(12,2) not null check (amount >= 0),
  source_reference text,
  created_at timestamptz not null default now(),
  unique(network,campaign,spend_date,source_reference)
);

create index if not exists acquisition_spend_date_idx on acquisition_spend(spend_date desc);


create table if not exists compliance_rules (
  id uuid primary key default gen_random_uuid(),
  destination_country text not null,
  nationality_scope text not null,
  rule_key text not null,
  rule_type text not null check (rule_type in ('SHORT_STAY','DIGITAL_NOMAD','RESIDENCE_REGISTRATION','OTHER')),
  max_presence_days integer,
  window_days integer,
  min_monthly_income numeric(12,2),
  income_currency text,
  source_url text not null,
  source_title text,
  effective_from date,
  effective_to date,
  verified_at timestamptz not null,
  expires_at timestamptz not null,
  human_reviewed boolean not null default false,
  requirements jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(destination_country,nationality_scope,rule_key,effective_from)
);

create index if not exists compliance_rules_lookup_idx
  on compliance_rules(destination_country,nationality_scope,rule_type,expires_at desc);
