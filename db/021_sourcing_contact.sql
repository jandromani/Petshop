alter table sourcing_requests
  add column if not exists requester_email text,
  add column if not exists contact_consent boolean not null default false,
  add column if not exists receipt_notified_at timestamptz,
  add column if not exists match_notified_at timestamptz;

create index if not exists sourcing_requests_contact_queue_idx
  on sourcing_requests(status,created_at desc)
  where requester_email is not null and contact_consent = true;
