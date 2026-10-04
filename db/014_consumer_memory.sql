create table if not exists consumer_profiles (
  id uuid primary key,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  last_seen_at timestamptz not null default now()
);

create table if not exists consumer_saved_stays (
  profile_id uuid not null references consumer_profiles(id) on delete cascade,
  offer_id text not null,
  slug text not null,
  name text not null,
  city text not null,
  country text not null,
  provider text not null,
  saved_monthly double precision not null check (saved_monthly > 0),
  currency text not null check (char_length(currency)=3),
  verified_at timestamptz not null,
  expires_at timestamptz,
  saved_at timestamptz not null default now(),
  primary key (profile_id, offer_id)
);

create index if not exists idx_consumer_saved_stays_profile_saved
  on consumer_saved_stays(profile_id,saved_at desc);

create index if not exists idx_consumer_profiles_last_seen
  on consumer_profiles(last_seen_at);
