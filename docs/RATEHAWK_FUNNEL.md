# RateHawk staged commercial funnel

RateHawk is deliberately not modelled like a click-through OTA.

## State machine

`SERP_CANDIDATE → HOTELPAGE_SELECTED → PREBOOK_VERIFIED → BOOKING_CAPABLE`

- SERP geo/region/hotel search discovers candidates. Those rates are never marked sellable.
- Hotelpage is requested only when a user selects a hotel.
- Hotelpage returns `h-` book hashes.
- Prebook verifies the selected rate and returns the book hash used by the booking flow.
- `RATEHAWK_BOOKING_ENABLED=true` is necessary but not sufficient. Atlas currently has no RateHawk booking transaction implementation, so prebook evidence remains discovery/non-commercial and cannot cross the Truth Gate.

The 30-day provider search limit means a 60/90/180-day life plan cannot be presented as one RateHawk booking merely by adding segment prices. Segment probing is discovery evidence; direct long-stay supply or provider-confirmed continuity must exist before the UX claims a single continuous stay.

This stage separation protects the commercial wrapper from stale SERP prices.
