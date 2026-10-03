create table if not exists ops_incidents (
  id uuid primary key default gen_random_uuid(),
  incident_key text unique not null,
  severity text not null,
  status text not null default 'OPEN',
  message text not null,
  occurrence_count integer not null default 1,
  first_seen_at timestamptz not null default now(),
  last_seen_at timestamptz not null default now(),
  resolved_at timestamptz
);

create table if not exists ops_audit_events (
  id uuid primary key default gen_random_uuid(),
  actor text not null,
  action text not null,
  resource_type text,
  resource_id text,
  outcome text not null,
  detail jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists ops_incidents_status on ops_incidents(status,severity,last_seen_at desc);
create index if not exists ops_audit_time on ops_audit_events(created_at desc);
