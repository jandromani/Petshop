# Atlas delivery state — R0 to R6 closure

This document distinguishes software closure from external commercial activation.

## R0 · MONEY TRUTH — SOFTWARE CLOSED
- monthly resources = pension + net home income + other recurring income
- reserve is explicit money kept untouched
- maximum living budget = resources - reserve
- route cost is a separate number
- living-budget headroom and total monthly headroom are separate
- planner cannot silently exceed budget
- no affordable route means no route
- annual plans cover exactly 365 days
- supported cadences: 30 / 60 / 90 / 120 / 180 days

## R1 · SEARCH CONTRACT — SOFTWARE CLOSED
One contract is shared by demo search, verified live search and concierge:
- query
- region
- check-in
- flexible dates: exact / ±7 / ±30
- duration
- occupancy
- maximum monthly budget

Live offers must match the requested dates, nights, occupancy and budget.

## R2 · PRIVACY + SECURITY — SOFTWARE CLOSED
- shared plans use opaque database IDs
- pension, rent and other income never enter share URLs
- operations login is POST-only
- signed HttpOnly operations sessions replace raw-secret cookies
- operational cookie is valid for both Control Tower and Hotel Desk
- public concierge and event ingestion are rate limited
- public concierge receives only the minimum budget/preferences needed
- public concierge output passes deterministic truth + brand judges
- baseline browser security headers and CSP are enabled

## R3 · REPRODUCIBLE DELIVERY — SOFTWARE CLOSED WHEN CI GATE IS GREEN
- package-lock.json committed
- npm install strategy fixed for deterministic dependency layout
- CI uses npm ci
- unit/type/build gates
- Playwright desktop + mobile E2E
- production smoke checks money/search/system contracts
- metadata derives the real Vercel deployment URL

External activation:
- canonical Vercel project must be linked directly to Petshop/master
- production DATABASE_URL and deployment secrets must exist

## R4 · BOOKING LIVE — SOFTWARE CLOSED
- Booking Demand API 3.2 search + details
- products + extra charges
- property description/facilities/photos/policies/rooms evidence
- room, board, cancellation and charge evidence normalized
- hard provider TTL
- exact dates + occupancy + budget live catalog contract
- canonical identity resolution
- immutable raw evidence + snapshot + sellability audit
- full click tracking label

External activation:
- Booking commercial credentials and affiliate approval

## R5 · SUPPLY OS — SOFTWARE CLOSED
- deterministic canonical-hotel resolver
- Booking discovery wave
- RateHawk mapped long-stay wave with segmented continuity
- HBX mapped availability/check-rate wave
- provider-specific freshness gates
- durable live-supply workflow
- scheduled supply cron now runs live provider control, not seed acquisition
- disabled providers are skipped explicitly rather than simulated

External activation:
- provider mappings/credentials
- RateHawk/HBX booking capability approval where required

## R6 · MONEY OS — SOFTWARE CLOSED
- click -> provider tracking ID -> conversion lineage
- Booking Orders incremental sync
- lifecycle: PENDING / CONFIRMED / CANCELLED / SETTLED / REVERSED
- raw conversion evidence
- commission rules
- currency-safe revenue summaries
- settlement references and timestamps
- event-driven reconciliation
- daily provider order sync + revenue reconciliation
- anomaly detection
- idempotent conversion updates

External activation:
- real partner reporting data / bookings
- commercial commission rules
- settlements from providers

## Non-negotiable production gate

No R0-R6 release is promoted unless:

`secret scan -> npm ci -> typecheck -> unit tests -> build -> Playwright E2E -> deployment smoke`

all pass.
