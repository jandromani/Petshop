alter table acquisition_runs
  add column if not exists mode text not null default 'seed',
  add column if not exists input jsonb not null default '{}'::jsonb,
  add column if not exists error_count integer not null default 0;

alter table offer_snapshots
  add column if not exists provider_request_id text,
  add column if not exists display_price numeric(12,2);

create index if not exists acquisition_runs_wave_started
  on acquisition_runs(wave_key, started_at desc);

create index if not exists offer_snapshots_provider_request
  on offer_snapshots(provider, provider_request_id);
