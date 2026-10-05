alter table sourcing_requests
  add column if not exists consumer_profile_id uuid references consumer_profiles(id) on delete set null;

alter table merchant_orders
  add column if not exists consumer_profile_id uuid references consumer_profiles(id) on delete set null;

create index if not exists sourcing_requests_consumer_profile_idx
  on sourcing_requests(consumer_profile_id,created_at desc)
  where consumer_profile_id is not null;

create index if not exists merchant_orders_consumer_profile_idx
  on merchant_orders(consumer_profile_id,created_at desc)
  where consumer_profile_id is not null;
