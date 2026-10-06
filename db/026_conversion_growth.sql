create table if not exists shared_searches (
  id text primary key,
  search_query text not null,
  hotel_ids jsonb not null default '[]'::jsonb check (jsonb_typeof(hotel_ids)='array' and jsonb_array_length(hotel_ids)<=3),
  language text not null default 'en' check (language in ('en','es')),
  created_at timestamptz not null default now(),
  expires_at timestamptz not null default now()+interval '90 days'
);
alter table sourcing_requests
  add column if not exists language text not null default 'en' check (language in ('en','es')),
  add column if not exists acquisition jsonb not null default '{}'::jsonb,
  add column if not exists quote_offer_id uuid,
  add column if not exists quote_sent_at timestamptz,
  add column if not exists quote_accepted_at timestamptz;
create table if not exists sourcing_access (
  token_hash text primary key,
  request_id uuid not null references sourcing_requests(id) on delete cascade,
  expires_at timestamptz not null default now()+interval '90 days',
  created_at timestamptz not null default now()
);
create table if not exists sourcing_mail_queue (
  request_id uuid not null references sourcing_requests(id) on delete cascade,
  kind text not null check (kind in ('receipt','match')),
  version text not null default 'receipt',
  language text not null default 'en' check (language in ('en','es')),
  state text not null default 'PENDING' check (state in ('PENDING','SENDING','SENT','FAILED')),
  attempts integer not null default 0,
  next_attempt_at timestamptz not null default now(),
  last_error text,
  provider_message_id text,
  accepted_at timestamptz,
  updated_at timestamptz not null default now(),
  primary key(request_id,kind,version)
);
create index if not exists sourcing_access_expiry on sourcing_access(expires_at);
create index if not exists sourcing_mail_pending on sourcing_mail_queue(next_attempt_at) where state in ('PENDING','SENDING');
