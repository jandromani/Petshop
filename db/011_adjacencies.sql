create table if not exists adjacency_referral_clicks (
  click_id uuid primary key,
  kind text not null,
  partner_key text not null,
  visitor_id text,
  session_id text,
  source text,
  campaign text,
  page_path text,
  target_host text not null,
  created_at timestamptz not null default now()
);

create table if not exists adjacency_conversions (
  id uuid primary key default gen_random_uuid(),
  click_id uuid not null references adjacency_referral_clicks(click_id) on delete cascade,
  kind text not null,
  partner_key text not null,
  provider_conversion_id text not null,
  booking_value numeric(14,2),
  commission numeric(14,2),
  currency text,
  status text not null default 'PENDING',
  raw_payload jsonb not null default '{}'::jsonb,
  received_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(partner_key,provider_conversion_id)
);

create index if not exists adjacency_clicks_kind_time on adjacency_referral_clicks(kind,created_at desc);
create index if not exists adjacency_conversions_time on adjacency_conversions(received_at desc);
