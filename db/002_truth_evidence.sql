create table if not exists raw_provider_evidence (
  id uuid primary key default gen_random_uuid(),
  provider text not null,
  provider_hotel_id text,
  provider_offer_id text,
  evidence_hash text not null,
  payload jsonb not null,
  captured_at timestamptz not null default now(),
  unique(provider, evidence_hash)
);

create table if not exists sellability_audits (
  id uuid primary key default gen_random_uuid(),
  hotel_id uuid references canonical_hotels(id) on delete cascade,
  offer_snapshot_id uuid references offer_snapshots(id) on delete cascade,
  state text not null,
  confidence numeric(5,4) not null,
  reasons jsonb not null default '[]'::jsonb,
  evidence_hash text,
  evaluated_at timestamptz not null default now()
);

alter table offer_snapshots
  add column if not exists source_mode text not null default 'live',
  add column if not exists evidence_hash text,
  add column if not exists deep_link text;

create index if not exists raw_provider_evidence_offer
  on raw_provider_evidence(provider, provider_offer_id, captured_at desc);

create index if not exists sellability_audits_state
  on sellability_audits(state, evaluated_at desc);
