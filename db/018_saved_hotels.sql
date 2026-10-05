create table if not exists consumer_saved_hotels (
  profile_id uuid not null references consumer_profiles(id) on delete cascade,
  hotel_id text not null,
  name text not null,
  city text not null,
  country text not null,
  source text not null,
  saved_at timestamptz not null default now(),
  primary key (profile_id,hotel_id)
);

create index if not exists idx_consumer_saved_hotels_profile_saved
  on consumer_saved_hotels(profile_id,saved_at desc);
