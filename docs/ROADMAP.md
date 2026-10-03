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


## R7 · PRODUCTION RUNTIME — SOFTWARE CLOSED
- private operations APIs accept signed ops sessions or explicit bearer automation auth
- process liveness and commercial readiness are separate endpoints
- production deploy waits for CI success and checks out the exact tested SHA
- deploy fails when VERCEL_TOKEN is absent instead of returning a false green
- production database migrations run with Vercel production env before build/deploy
- production smoke is mandatory after deployment
- activation manifest exposes missing external dependencies without exposing secret values

External activation:
- GitHub Actions VERCEL_TOKEN
- Vercel project linkage
- DATABASE_URL + migrations
- CRON_SECRET / OPS_ACCESS_KEY

## R8 · DIRECT SUPPLY — SOFTWARE CLOSED
- hotel leads capture canonical geography and commercial contacts
- rate creation is DRAFT-only
- contract verification is a separate authenticated action
- booking hostname is pinned server-side during verification
- publication is a deterministic DRAFT → READY_FOR_REVIEW → LIVE gate
- revocation removes a direct rate from sellable inventory
- live catalog merges provider snapshots and verified direct-contract offers
- direct referrals only redirect to the approved booking hostname

External activation:
- real hotel agreements
- contractual booking URLs, cancellation terms and validity windows

## R9 · GOVERNED AUTONOMY — SOFTWARE CLOSED
- agent runtime requires persistent governance DB
- daily run caps are reserved atomically
- actor output cannot publish prices, sign contracts or commit money
- deterministic truth/brand judges run outside actor generation
- independent LLM judge remains downstream
- model usage/cost evidence is persisted when reported
- operational incidents open/reopen/resolve deterministically
- Daily Control produces a <60 minute human agenda
- retention and revenue reconciliation run in the durable daily workflow

External activation:
- OPENROUTER_API_KEY is optional
- human approval remains mandatory for contracts, material spend and publication gates

## R10 · GROWTH + SEO — SOFTWARE CLOSED
- attribution, referral and conversion funnel is queryable by source/campaign
- hero experiment readout uses observed visitors/referrals, not synthetic scores
- demo hotel pages are NOINDEX
- discovery pages index only when live evidence passes SEO gates
- sitemap contains only current evidence-backed live surfaces
- commercial demo and live inventory never silently substitute for one another
- retention scrubs old pseudonymous analytics/referral fields

External activation:
- SEO_LIVE_INDEXING=true only after commercial inventory exists
- paid acquisition budgets remain outside autonomous authority

## R11 · RELEASE + GOVERNANCE — SOFTWARE CLOSED
- legal/commercial disclosure explains referral economics and demo-vs-live truth
- operator identity is an explicit launch gate
- canonical production URL is derived from configured/Vercel production identity
- system proof exposes software readiness and activation state separately
- lockfile integrity is read-only and reproducible
- CODEOWNERS + CI gates remain required
- deployment is source-SHA exact, migrated, prebuilt and smoke-tested

External activation:
- LEGAL_OPERATOR_NAME
- LEGAL_CONTACT_EMAIL
- LEGAL_COUNTRY
- final jurisdiction-specific legal/tax/travel-package review before selling bundled services

## R0–R11 release invariant

A software release is mergeable only after:

`secret scan → npm ci → typecheck → unit tests → build → Playwright desktop/mobile`

A production release is successful only after:

`tested master SHA → production migrations → prebuilt Vercel deploy → production smoke`

READY never means LIVE. ACTIVATION_REQUIRED is not converted into green by mock data, missing credentials or skipped deployment steps.
