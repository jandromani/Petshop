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


## R7 · DIRECT HOTEL OS — SOFTWARE CLOSED
- hotel leads capture canonical geography + commercial contacts
- rate creation is DRAFT-only
- contract verification is a separate authenticated action
- approved booking hostname is pinned server-side
- deterministic DRAFT → READY_FOR_REVIEW → LIVE publication gate
- revocation removes direct inventory from sellable surfaces
- verified direct contracts merge into the same live catalogue as provider snapshots
- direct referrals can redirect only to the approved hostname
- no agent can sign a contract or self-publish a rate

External activation:
- real hotel agreements
- contractual URLs, validity windows and cancellation terms

## R8 · AGENT COMPANY — SOFTWARE CLOSED
- bounded registry of specialist roles
- persistent governance DB is mandatory
- atomic per-agent daily run caps
- operational signals route to specialist agents
- every role executes its declared deterministic judges plus Truth
- independent external LLM judge remains downstream
- actor outputs cannot publish, sign contracts or commit money
- approved artifacts become PROPOSED tasks in a human review inbox
- Control Tower surfaces incidents, runs, costs and proposal tasks
- Daily Control targets less than 60 minutes of human attention
- data retention + revenue reconciliation run in the durable control workflow

External activation:
- OPENROUTER_API_KEY to run the optional autonomous workforce
- human authority remains mandatory for contracts, publication and material spend

## R9 · SEO ENGINE — SOFTWARE CLOSED
- demo inventory is NOINDEX
- live pages index only from current SELLABLE evidence
- discovery intents are normalized against live dimensions
- narrative uniqueness is computed rather than hardcoded
- sitemap emits only evidence-backed live surfaces
- canonical URLs derive from production identity
- live Hotel/Offer and discovery ItemList JSON-LD are rendered
- demo and live inventory never silently substitute for one another
- attribution and observed experiment readouts use real visitor/referral data
- retention scrubs old pseudonymous analytics/referral data

External activation:
- SEO_LIVE_INDEXING=true only after real commercial inventory exists
- paid acquisition remains outside autonomous authority

## R10 · SILVER BOOKING UX — SOFTWARE CLOSED
- explicit Money Truth: resources → reserve → maximum living budget → route cost
- one search contract: destination, dates, flexibility, duration, occupancy and budget
- 30 / 60 / 90 / 120 / 180-day stays and 365-day route generation
- verified live cards show monthly equivalent + total price
- Booking details normalize photos, facilities and description into canonical hotel content
- rich live cards display real provider media when available and never invent imagery
- room, board, cancellation and charge evidence are surfaced when available
- Silver Fit is computed from live evidence rather than a manually typed live score
- responsive desktop/mobile E2E gates protect the consumer flow
- no affordable result is presented as affordable

External activation:
- real provider/direct inventory determines how rich the live cards become

## R11 · ADJACENCIES — SOFTWARE CLOSED
- five independent lanes: flights, insurance, telemedicine, airport transfer and home management
- partner registry is fail-closed and HTTPS-only
- every lane is inactive until partner name/key/URL are explicitly configured
- adjacency clicks have a separate referral ledger
- conversion ingestion is idempotent and authenticated
- UI labels inactive lanes as ACTIVATION REQUIRED
- accommodation price never silently includes an adjacency
- legal disclosure states these are independent referrals, not an Atlas package

External activation:
- partner agreements + referral destinations/tracking parameters per lane
- jurisdiction-specific review before combining services into any package

## TRANSVERSAL · PRODUCTION RUNTIME + RELEASE GOVERNANCE — SOFTWARE CLOSED
- signed operations sessions + explicit bearer automation boundaries
- liveness, software readiness and commercial readiness are separate states
- production deploy waits for CI success and checks out the exact tested SHA
- deployment fails closed when VERCEL_TOKEN is absent
- production migrations run before prebuilt deployment
- post-deploy production smoke is mandatory
- activation manifest exposes missing external dependencies without secret values
- legal operator identity is a launch gate
- consent layer gates optional analytics
- lockfile/migrations are reproducible and idempotent

External activation:
- GitHub Actions VERCEL_TOKEN
- canonical Vercel project linked to Petshop/master
- DATABASE_URL, OPS_ACCESS_KEY, CRON_SECRET
- LEGAL_OPERATOR_NAME, LEGAL_CONTACT_EMAIL, LEGAL_COUNTRY

## R0–R11 release invariant

A software release is mergeable only after:

`secret scan → npm ci → typecheck → unit tests → build → Playwright desktop/mobile`

A production release is successful only after:

`tested master SHA → production migrations → prebuilt Vercel deploy → production smoke`

READY never means LIVE. ACTIVATION_REQUIRED is not converted into green by mock data, missing credentials or skipped deployment steps.
