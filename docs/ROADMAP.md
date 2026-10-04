# Atlas delivery state — R0 to R13

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
- Vercel Git Integration is the primary production deployment path
- CI verifies the exact tested SHA when runtime-affecting files changed and accepts deployment skips only for non-runtime diffs
- production migrations run through `vercel-build` whenever DATABASE_URL exists
- post-deploy production smoke is mandatory
- activation manifest exposes missing external dependencies without secret values
- legal operator identity is a launch gate
- consent layer gates optional analytics
- lockfile/migrations are reproducible and idempotent

External activation:
- production DATABASE_URL
- OPS_ACCESS_KEY and CRON_SECRET
- canonical Vercel project remains linked to Petshop/master
- LEGAL_OPERATOR_NAME, LEGAL_CONTACT_EMAIL, LEGAL_COUNTRY

## R0–R11 release invariant

A software release is mergeable only after:

`secret scan → npm ci → typecheck → unit tests → build → Playwright desktop/mobile`

A production release is successful only after:

`CI-tested master SHA → Git-linked Vercel production → exact-SHA wait → production smoke`

READY never means LIVE. ACTIVATION_REQUIRED is not converted into green by mock data, missing credentials or skipped deployment steps.


## R12 · ACTUATION OS — SOFTWARE CLOSED WHEN CI GATE IS GREEN
- OpenRouter is the default free/low-cost model lane in production
- Vercel AI Gateway/OIDC remains an optional fallback and is blocked unless paid fallback is explicitly enabled
- actor and judge model independence is enforced by default
- actor output is strict JSON with one bounded proposed action or no action
- every role has an explicit action allowlist
- only read-only/idempotent action classes can auto-execute:
  - `ops.snapshot`
  - `growth.audit`
  - `seo.audit`
  - `revenue.reconcile`
- material action classes never auto-execute:
  - supply refreshes that consume partner quota
  - direct-rate publication
  - hotel outreach
  - SEM spend
  - code changes
- every proposed action is persisted in the agent task ledger
- auto-execution result/state is persisted separately from the LLM artifact
- per-role daily run caps are reduced to bounded production values
- a global daily agent-cost ceiling is configurable with `AGENT_DAILY_BUDGET_CENTS`
- Daily Control can dispatch governed specialists and execute only policy-approved safe actions
- Growth Autopilot can promote an existing hero variant only after:
  - at least 100 exposed visitors per compared variant
  - at least 5 referral visitors for the winner
  - at least 1 percentage point absolute referral-rate improvement
  - at least 15% relative uplift
- Growth Autopilot uses consent-gated observed data and stores the decision + evidence in `runtime_config`
- home rendering consumes the deterministic hero override when one exists
- SEO indexing mode supports `auto`: live pages remain NOINDEX until Truth + freshness + inventory + uniqueness gates pass
- synthetic system proof now labels itself explicitly and cannot masquerade as production/commercial proof
- readiness distinguishes implemented, deployed, externally observed and commercially live states
- Vercel Git Integration is the primary production delivery path
- production verification waits until the exact CI-tested Git SHA appears at the stable production alias
- `vercel-build` applies migrations automatically when `DATABASE_URL` exists, then builds the application
- migration 012 adds durable runtime config and agent action execution state

External activation:
- production Postgres/Neon `DATABASE_URL`
- legal operator name + contact email
- first verified direct hotel contract or optional OTA/provider credentials
- real user traffic before Growth Autopilot can choose a winner
- final custom domain


## OMEGA · 10/10 HARDENING — ACTIVE
The product roadmap is no longer sufficient as the definition of completion.

Implemented on master through the OMEGA hardening program:
- database health checks reach Postgres rather than trusting env presence
- direct-hotel inventory can satisfy commercial readiness without an OTA
- migration advisory lock
- migration ledger + SHA-256 checksum drift protection
- direct/unpooled Neon connection preferred for migrations
- production dependency audit
- Dependabot
- CodeQL
- dependency review

The remaining cross-functional 10/10 gates are tracked in `docs/OMEGA_ROADMAP.md`.


## R13 · CONSUMER MEMORY OS — SOFTWARE CLOSED WHEN CI GATE IS GREEN
- saved stays remain usable with browser-local fallback when no database exists
- production persistence uses an opaque HttpOnly saved-profile cookie rather than email/account identity
- the server stores only pseudonymous saved-stay references and commercial evidence snapshots
- no pension, income, email, name or payment data is stored in consumer memory
- existing local saved stays synchronize into durable memory when the database becomes available
- deletes propagate to durable memory
- self-service clear-all deletes the anonymous server profile, cascades saved stays, clears the HttpOnly profile cookie and clears local saved references
- every saved-memory API response is `Cache-Control: no-store`
- saved offers are still revalidated against the live catalogue before being presented as current
- inactive consumer profiles expire through the retention workflow and cascade-delete saved references
- cookie and privacy disclosures describe the anonymous memory layer

External activation:
- production DATABASE_URL; without it the feature safely remains local-only
