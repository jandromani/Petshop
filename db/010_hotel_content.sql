create table if not exists hotel_content (
  hotel_id uuid primary key references canonical_hotels(id) on delete cascade,
  provider text not null,
  description text,
  photo_urls jsonb not null default '[]'::jsonb,
  facilities jsonb not null default '[]'::jsonb,
  source_hash text,
  updated_at timestamptz not null default now()
);

create index if not exists hotel_content_provider on hotel_content(provider,updated_at desc);
