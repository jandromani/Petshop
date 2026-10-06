# Open-source inventory

Code may only be copied when the license is compatible and attribution obligations are satisfied.

| Project | Potential use | License | Decision |
|---|---|---|---|
| MapLibre GL JS | interactive world map | BSD-3-Clause | USE / dependency |
| Leaflet | 2D hotel map fallback when WebGL2 is unavailable | BSD-2-Clause | USE / lazy dependency |
| amadeus4dev/amadeus-node | flight API adapter patterns | MIT, archived | REFERENCE |
| dimitryzub/hotels-scraper-js | hotel discovery/enrichment patterns | MIT | STUDY / selective reuse |
| BaseMax/TravelPlannerGraphQLTS | itinerary concepts | GPL-3.0 | STUDY ONLY |
| repos without explicit license | any | none | DO NOT COPY |

The product moat is not copied code. It is the long-stay truth layer, intent graph, Silver Score, referral attribution and commercial wrapper.

The Leaflet fallback uses normal interactive OpenStreetMap raster tiles by default,
with visible attribution and browser caching. No offline downloads, bulk fetching
or tile prefetch jobs are permitted. The community tile service is best-effort;
deployments can set `NEXT_PUBLIC_RASTER_TILE_URL` and
`NEXT_PUBLIC_RASTER_TILE_ATTRIBUTION` for another provider.
Policy: https://operations.osmfoundation.org/policies/tiles/.
