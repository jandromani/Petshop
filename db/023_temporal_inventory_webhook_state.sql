create table if not exists merchant_inventory_reservations (
  order_id uuid primary key references merchant_orders(id) on delete cascade,
  direct_rate_offer_id uuid not null references direct_rate_offers(id) on delete restrict,
  check_in date not null,
  check_out date not null,
  state text not null default 'RESERVED'
    check (state in ('RESERVED','PAID','CONFIRMED','RELEASED','CANCELLED','REFUNDED')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (check_out > check_in)
);

create index if not exists merchant_inventory_reservations_offer_dates_idx
  on merchant_inventory_reservations(direct_rate_offer_id,check_in,check_out,state);

insert into merchant_inventory_reservations(order_id,direct_rate_offer_id,check_in,check_out,state)
select id,direct_rate_offer_id,check_in,check_in+nights,
  case
    when status='PAID' then 'PAID'
    when status='CONFIRMED' then 'CONFIRMED'
    when status in ('CREATED','CHECKOUT_CREATED') then 'RESERVED'
    when status='REFUNDED' then 'REFUNDED'
    else 'RELEASED'
  end
from merchant_orders
on conflict(order_id) do nothing;

alter table merchant_payment_events
  add column if not exists processing_state text not null default 'PROCESSED'
    check (processing_state in ('PROCESSING','PROCESSED','FAILED')),
  add column if not exists attempts integer not null default 1 check (attempts >= 1),
  add column if not exists processed_at timestamptz,
  add column if not exists last_error text;

update merchant_payment_events
set processing_state='PROCESSED',processed_at=coalesce(processed_at,received_at)
where processing_state='PROCESSED' and processed_at is null;
