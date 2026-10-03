create table if not exists hotel_leads (
  id uuid primary key default gen_random_uuid(),
  canonical_hotel_id uuid references canonical_hotels(id) on delete set null,
  hotel_name text not null,
  city text not null,
  country text not null,
  website text,
  contact_name text,
  contact_role text,
  contact_email text,
  status text not null default 'DISCOVERED',
  source text,
  notes jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists direct_rate_offers (
  id uuid primary key default gen_random_uuid(),
  hotel_lead_id uuid not null references hotel_leads(id) on delete cascade,
  canonical_hotel_id uuid references canonical_hotels(id) on delete set null,
  rate_code text not null,
  min_nights integer not null,
  max_nights integer,
  board text,
  monthly_price numeric(12,2) not null,
  currency text not null default 'EUR',
  valid_from date,
  valid_to date,
  blackout_dates jsonb not null default '[]'::jsonb,
  cancellation text,
  booking_url text,
  contract_reference text,
  contract_verified boolean not null default false,
  publication_state text not null default 'DRAFT',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(hotel_lead_id,rate_code)
);

create index if not exists hotel_leads_status on hotel_leads(status,updated_at desc);
create index if not exists direct_rates_state on direct_rate_offers(publication_state,updated_at desc);
