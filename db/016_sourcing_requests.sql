create table if not exists sourcing_requests (
  id uuid primary key default gen_random_uuid(),
  directory_hotel_id text not null,
  hotel_name text not null,
  city text not null,
  country text not null,
  check_in date not null,
  nights integer not null check (nights in (30,60,90,120,180,365)),
  occupancy integer not null check (occupancy in (1,2)),
  target_monthly_eur numeric(12,2),
  requester_hash text not null,
  source_path text,
  status text not null default 'OPEN' check (status in ('OPEN','SOURCING','MATCHED','CLOSED')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(requester_hash,directory_hotel_id,check_in,nights,occupancy)
);

create index if not exists sourcing_requests_status_created_idx
  on sourcing_requests(status,created_at desc);

create index if not exists sourcing_requests_hotel_idx
  on sourcing_requests(directory_hotel_id,created_at desc);
