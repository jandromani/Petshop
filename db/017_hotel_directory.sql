create table if not exists hotel_directory_sources (
  id uuid primary key default gen_random_uuid(),
  hotel_id uuid not null references canonical_hotels(id) on delete cascade,
  source text not null,
  source_id text not null,
  reference_url text,
  website text,
  raw jsonb not null default '{}'::jsonb,
  first_seen_at timestamptz not null default now(),
  last_seen_at timestamptz not null default now(),
  unique(source,source_id)
);

create index if not exists hotel_directory_sources_hotel
  on hotel_directory_sources(hotel_id,last_seen_at desc);

create index if not exists hotel_directory_sources_source
  on hotel_directory_sources(source,last_seen_at desc);