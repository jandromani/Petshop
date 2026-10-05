alter table referral_clicks
  add column if not exists gclid text,
  add column if not exists gbraid text,
  add column if not exists wbraid text,
  add column if not exists msclkid text;

create index if not exists referral_clicks_gclid on referral_clicks(gclid) where gclid is not null;
create index if not exists referral_clicks_gbraid on referral_clicks(gbraid) where gbraid is not null;
create index if not exists referral_clicks_wbraid on referral_clicks(wbraid) where wbraid is not null;
create index if not exists referral_clicks_msclkid on referral_clicks(msclkid) where msclkid is not null;
