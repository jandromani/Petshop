create table if not exists scheduled_run_claims (
  job_key text not null,
  slot_key text not null,
  run_id text,
  status text not null default 'CLAIMED' check (status in ('CLAIMED','STARTED')),
  claimed_at timestamptz not null default now(),
  started_at timestamptz,
  primary key (job_key, slot_key)
);

create index if not exists scheduled_run_claims_claimed_at_idx
  on scheduled_run_claims(claimed_at desc);
