-- Hotel-specific, expiring access. Only token hashes are persisted.
create table hotel_portal_access (
  id uuid primary key default gen_random_uuid(),
  hotel_lead_id uuid not null references hotel_leads(id) on delete cascade,
  token_hash text not null unique check (token_hash ~ '^[0-9a-f]{64}$'),
  expires_at timestamptz not null,
  revoked_at timestamptz,
  created_at timestamptz not null default now()
);
create index hotel_portal_access_lead on hotel_portal_access(hotel_lead_id);
