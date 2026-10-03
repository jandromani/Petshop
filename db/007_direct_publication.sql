alter table hotel_leads
  add column if not exists region text,
  add column if not exists lat double precision,
  add column if not exists lng double precision;

alter table direct_rate_offers
  add column if not exists max_guests integer not null default 2,
  add column if not exists approved_booking_host text,
  add column if not exists verified_at timestamptz,
  add column if not exists published_at timestamptz,
  add column if not exists revoked_at timestamptz,
  add column if not exists review_notes text,
  add column if not exists tracking_query_param text;

create index if not exists direct_rates_live
  on direct_rate_offers(publication_state,valid_from,valid_to)
  where publication_state='LIVE';
