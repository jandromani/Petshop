# Delivery roadmap — closure state

The software architecture is now implemented as four operational layers. Remaining items are explicitly classified as **external activation**, not missing architecture.

## Layer 1 — Experience / Growth
Status: **SOFTWARE COMPLETE**
- deterministic retirement budget planner
- route engine + mobility estimate
- world map
- shareable plans + OG cards
- discovery / SEO landing pages with evidence gate
- A/B hero experiment
- first-party UTM / visitor / session attribution
- live catalog lane that never falls back silently to demo data
- AI concierge with deterministic truth boundary
- public /system proof page

External activation:
- real traffic
- SEM budget
- live flight/meta-search partner if desired

## Layer 2 — Supply / Truth
Status: **SOFTWARE COMPLETE**
- Booking Demand API v3.2
- RateHawk staged SERP → hotelpage → prebook flow
- HBX availability / booking-readiness gate
- provider conformance tests
- canonical hotels + provider identity mapping
- immutable raw evidence hashes
- offer snapshots
- Truth Gate: DEMO / SELLABLE / STALE / QUARANTINED
- long-stay segmentation / continuity rules
- durable acquisition workflows
- truth-gated live catalog

External activation:
- provider credentials / commercial approval
- production Postgres + migrations
- first live acquisition wave
- real 30/60/90/180 inventory volume

## Layer 3 — Money / Referral
Status: **SOFTWARE COMPLETE**
- click_id lineage
- referral persistence
- verified offer re-check before redirect
- safe commercial URL allowlist
- conversion ingestion
- revenue / commission summary
- durable queue fan-out for referral + conversion events
- attribution from visitor/session/UTM to conversion

External activation:
- real affiliate / partner IDs
- provider conversion report/webhook
- first completed booking and commission payment

## Layer 4 — Autonomous Operations
Status: **SOFTWARE COMPLETE**
- 11 bounded agent roles
- authority / spend limits
- deterministic truth + brand judges
- external LLM judge outside actor flow
- persisted agent runs + judge reviews
- durable Workflow processes
- Vercel Queues event bus
- daily control workflow
- Control Tower 2.0 backed by runtime data
- public full-system proof
- production smoke suite
- human attention target < 60 min/day

External activation:
- OpenRouter env key on deployment
- production Vercel project
- runtime traffic to populate histories

## Production closure definition

The repo is considered software-closed when CI passes:
`secret scan → typecheck → tests → build`.

A deployment is considered runtime-closed when:
`/ → /system → /api/health → /api/system/status → /api/catalog/live`
all pass `npm run smoke:production`.

Commercial closure is deliberately separate and requires third-party credentials, contracts and an actual conversion. No test fixture may be represented as commercial revenue.
