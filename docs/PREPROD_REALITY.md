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


## Directory Ingest

The 121-property curated snapshot is now a fallback, not the scalability ceiling.

When Neon is configured, Atlas can ingest thousands of real property identities through the ops-protected endpoint:

`POST /api/hotel-desk/directory/import`

The importer persists a canonical hotel plus provenance in `hotel_directory_sources`. Imported identities work end-to-end in the customer directory, hotel detail page and anonymous sourcing queue.

CLI:

`npm run directory:import -- --file hotels.json --base-url https://<preprod> --token <OPS_TOKEN> --source overture`

Overpass/OpenStreetMap JSON is also accepted as an offline snapshot:

`npm run directory:import -- --file madrid.json --base-url https://<preprod> --token <OPS_TOKEN> --city Madrid --country Spain --region Europe`

OpenStreetMap is deliberately an ingestion source, not a runtime dependency. OSM source IDs and reference URLs are retained, and rendered OSM records carry contributor attribution.
