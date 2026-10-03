# Live supply providers

## Booking Demand API
- Search endpoint: `POST /accommodations/search`
- Auth: bearer token + `X-Affiliate-Id`
- Search returns price/currency and may return attributable web/deep links.
- Env: `BOOKING_API_KEY`, `BOOKING_AFFILIATE_ID`, optional `BOOKING_API_BASE`.

## RateHawk / Emerging Travel Group v3
- Bootstrap search endpoint: `POST /api/b2b/v3/search/serp/hotels/`
- Auth: HTTP Basic `KEY_ID:API_KEY`
- Search call supports max 300 hotel IDs and the documented checkout limit is 30 days after check-in.
- SERP rates are not treated as final. Selected hotels must move through hotelpage/prebook before commercial presentation.
- Env: `RATEHAWK_KEY_ID`, `RATEHAWK_API_KEY`, optional `RATEHAWK_API_BASE`.

## HBX / Hotelbeds
- Availability endpoint: `POST /hotel-api/1.0/hotels`
- Auth: `Api-key` + SHA256 `X-Signature` over apiKey + secret + current epoch seconds.
- Production booking operations require mTLS; certificate lifecycle must be handled before enabling booking.
- Env: `HBX_API_KEY`, `HBX_SECRET`, optional `HBX_API_BASE`.

## Long-stay rule

A 60/90/180-day product is never inferred from a single short quote. Where provider limits require segmentation, Petshop probes contiguous segments and publishes only when continuity, currency and pricing gates pass.

## Safety rule

Missing credentials => provider DISABLED.
Missing provider evidence => offer NOT SELLABLE.
