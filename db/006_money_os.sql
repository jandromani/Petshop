alter table referral_clicks
  add column if not exists provider_tracking_id text unique;

alter table conversions
  add column if not exists raw_payload jsonb not null default '{}'::jsonb,
  add column if not exists updated_at timestamptz not null default now(),
  add column if not exists cancelled_at timestamptz,
  add column if not exists settled_at timestamptz,
  add column if not exists settlement_reference text;

create table if not exists commission_rules (
  id uuid primary key default gen_random_uuid(),
  provider text not null,
  rule_key text not null,
  rule_type text not null,
  value numeric(12,4) not null,
  currency text,
  active_from timestamptz not null default now(),
  active_to timestamptz,
  created_at timestamptz not null default now(),
  unique(provider,rule_key,active_from)
);

create table if not exists revenue_reconciliation_runs (
  id uuid primary key default gen_random_uuid(),
  status text not null,
  window_start timestamptz not null,
  window_end timestamptz not null,
  conversions_count integer not null default 0,
  anomalies_count integer not null default 0,
  metrics jsonb not null default '{}'::jsonb,
  anomalies jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists conversions_status_received on conversions(status,received_at desc);
create index if not exists commission_rules_provider_active on commission_rules(provider,active_from desc);

create table if not exists provider_sync_cursors (
  provider text not null,
  stream text not null,
  cursor_at timestamptz not null,
  updated_at timestamptz not null default now(),
  primary key(provider,stream)
);
