# PREPROD REALITY — customer-facing truth layer

Preproduction no longer needs fake hotel cards to look populated.

- Real-property directory is separate from commercial inventory.
- Initial snapshot: 121 named real hotel entities across Europe, Africa, Asia and the Americas.
- Directory cards never carry synthetic prices.
- A detail page attaches a verified Atlas rate only when live/direct commercial evidence matches the property.
- Search horizons: 30 / 60 / 90 / 120 / 180 / 365 days.
- Insurance, telemedicine, transfers, flights and home-management each have an independent landing page.
- Public/reference links remain separate from monetized tracked referrals.

Truth states:
1. REAL_PROPERTY — identity in directory.
2. RATE_PENDING — no verified commercial rate.
3. VERIFIED RATE — price, dates, freshness and fulfillment passed gates.
4. REFERRAL ACTIVE — approved tracked partner destination exists.

The directory API is paginated and can scale to 1,000–2,000 records without a frontend rewrite. Bulk expansion should come from contracted provider content, Overture/OSM extracts or a paid/self-hosted geodata service; do not run production-scale commercial traffic against a free public Overpass endpoint.

A 365-day intent is supported. Provider-specific limits remain explicit; segmented quotes are not represented as one atomic annual booking unless fulfillment evidence proves that path.
