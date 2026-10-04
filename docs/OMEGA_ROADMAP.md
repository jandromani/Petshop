# OMEGA roadmap — Atlas to 10/10

This roadmap is intentionally stricter than the product roadmap. A capability is not 10/10 because code exists; it is 10/10 only when runtime evidence, failure handling, security, legal/commercial activation and measurable outcomes exist.

## Current audited baseline — 2026-10-04

| Dimension | Current | 10/10 gate |
| --- | ---: | --- |
| Product architecture | 9.0 | production evidence + no contradictory gates |
| Delivery/release | 9.0 | protected mainline + security scans + exact-SHA deploy + rollback proof |
| Data plane | 4.0 | reachable Neon + isolated previews + migration ledger + restore drill |
| Security | 7.0 | CodeQL/dependency controls + WAF/rate policy + branch protection + incident runbook |
| Privacy/legal | 6.0 | real controller identity + complete privacy/terms + rights workflow + subprocessor record |
| Observability | 6.0 | analytics enabled + SLOs + alerts + cost/error dashboards |
| Autonomous operations | 8.0 | durable DB + evals/replay + tool attestations + circuit breakers + safe action coverage |
| Supply | 0.0 | verified SELLABLE inventory with freshness and revalidation |
| Money/revenue | 1.0 | observed referral → conversion → commission → settlement loop |
| SEO/growth | 5.0 | final domain + live inventory + indexing evidence + measured acquisition |
| Resilience | 5.0 | backup/PITR + restore drill + provider outage/rollback drills |
| Venture readiness | 3.0 | traction, unit economics, supply density and repeatable acquisition |

## OMEGA-0 · Truth baseline — DONE

- production project linked directly to GitHub
- exact tested SHA verified on production
- CI, unit, build and Playwright gates green
- synthetic proof is explicitly labelled synthetic
- readiness distinguishes software, infrastructure and commercial evidence
- AI Gateway OIDC credential probe is real, not inferred

Exit gate: production health reports the exact deployment SHA and does not claim commercial readiness without external evidence.

## OMEGA-1 · Neon data plane — BLOCKED ON CONNECTION AUTH

Objective: make Atlas durable without sharing production state with previews.

- install/provision Neon through the Vercel Marketplace or connect the Neon ChatGPT app
- select an EU Neon region close to the Vercel function region and primary users
- connect Production and Preview
- enable a Neon database branch per Vercel Preview deployment
- runtime uses pooled `DATABASE_URL`
- migrations prefer direct `DATABASE_URL_UNPOOLED` / `DIRECT_URL`
- migrations run under a Postgres advisory lock
- maintain `atlas_schema_migrations` with SHA-256 checksums
- reject migration drift
- health performs `SELECT current_database(), now()` rather than checking env presence
- expose DB latency without exposing credentials
- configure Neon backup/PITR policy appropriate to the commercial plan
- document RPO/RTO
- perform and record one restore drill

Exit gate:
- `/api/health` → `databaseConfigured:true`, `databaseReachable:true`
- migrations 001–015 are recorded with checksums
- a preview deployment uses an isolated Neon branch
- a restore drill succeeds

## OMEGA-2 · Release integrity — IN PROGRESS

- production dependency audit blocks HIGH/CRITICAL runtime vulnerabilities
- CodeQL scans JavaScript/TypeScript
- Dependency Review blocks high-severity dependency changes
- Dependabot maintains npm and GitHub Actions dependencies
- protect `master`
- require CI, CodeQL and dependency-review checks
- require PR before merge
- require conversation resolution
- disable force-push/delete on `master`
- enable automatic branch deletion after merge
- keep exact-SHA production verification
- maintain rollback target and rollback procedure

Exit gate: nobody can place an untested commit on production or silently rewrite migration history.

## OMEGA-3 · Edge/runtime security — PARTIAL

- keep preview SSO protection
- keep protected sourcemaps and Git fork protection
- enable Vercel Firewall/WAF
- start OWASP managed rules in LOG mode, inspect false positives, then move high-confidence classes to DENY
- add edge rate limits for public high-cost endpoints:
  - `/api/agent`
  - `/api/events`
  - `/api/referral`
  - conversion ingestion endpoints
- add bot/abuse policy for scraping and credential attacks
- keep application-level DB rate limiting as defense in depth
- rotate OPS/CRON/conversion secrets on a documented schedule
- incident severity, containment and credential-rotation procedure are documented in `docs/INCIDENT_RUNBOOK.md`
- responsible vulnerability disclosure is documented in `SECURITY.md`; a real operator contact remains a launch dependency

Exit gate: abusive traffic is controlled before compute/DB, and secrets/incident response have an operational owner.

## OMEGA-4 · Observability and SRE — PARTIAL

- enable Vercel Web Analytics at the project level
- retain consent-gated `Analytics` and `SpeedInsights` components
- define SLOs:
  - availability
  - p95/p99 latency
  - provider acquisition success
  - referral redirect success
  - conversion ingestion success
  - agent run failure/cost
- add alert thresholds and notification destination
- surface database latency and connection failures
- add workflow duration/retry metrics
- add AI token/cost/model metrics by role
- add provider error budgets
- create weekly operating scorecard
- do not use absence of errors as evidence of user success

Exit gate: a meaningful production regression wakes somebody up without manually opening dashboards.

## OMEGA-5 · Privacy, GDPR and legal — ACTIVATION REQUIRED

- configure real legal operator name and contact email
- replace launch-gate text with final controller identity before commercial launch
- publish complete privacy notice:
  - controller
  - purposes/legal bases
  - data categories
  - recipients/subprocessors
  - retention
  - international transfers where applicable
  - rights and complaint authority
- publish Terms of Use
- publish Cookie/Analytics policy
- version consent and legal documents
- implement privacy rights workflow for pseudonymous data:
  - access/export where identifiable
  - deletion
  - consent withdrawal
- maintain subprocessors/DPA inventory
- document legitimate-interest/consent analysis for referral attribution
- perform travel-services/package-law review before any bundled offer
- review hotel outreach rules before automated outbound email

Exit gate: commercial launch is legally attributable, privacy rights are operational, and Atlas does not accidentally become an unreviewed package-travel seller.

## OMEGA-6 · Supply density — EXTERNAL

- activate Direct Hotel OS first
- create a standard long-stay commercial agreement/checklist
- onboard first verified hotel
- then 10 hotels across at least 3 destinations
- require:
  - validity window
  - occupancy
  - min/max nights
  - cancellation
  - approved HTTPS booking host
  - tracking parameter
  - contract reference
- automatically mark stale/expired supply unavailable
- add re-verification cadence before expiry
- measure rate acceptance/rejection reasons
- optional accelerators:
  - Booking
  - RateHawk
  - HBX

Exit gate: at least 10 fresh SELLABLE offers are visible from real commercial evidence; no demo inventory is counted.

## OMEGA-7 · Money loop — EXTERNAL + SOFTWARE HARDENING

- observe real referral clicks
- ingest real partner conversion evidence
- reconcile click → booking → commission
- define commission rules with effective dates
- support cancellation/reversal/settlement lifecycle
- define FX treatment and reporting currency
- add duplicate/out-of-window attribution tests
- reconcile provider totals against Atlas ledger
- define invoice/tax/accounting treatment with accountant
- monitor:
  - booking value
  - take rate
  - expected vs confirmed commission
  - settled cash
  - attribution loss

Exit gate: at least one real booking can be traced end-to-end to settled revenue with immutable evidence.

## OMEGA-8 · SEO and growth — ARMED, NOT PROVEN

- buy/attach final domain
- change `NEXT_PUBLIC_SITE_URL`
- verify canonical, sitemap, hreflang and OG after cutover
- connect Google Search Console and Bing Webmaster Tools
- submit live sitemap only after SELLABLE inventory exists
- validate Hotel/Offer/ItemList structured data
- generate destination pages only from live evidence
- build internal-link graph from inventory
- keep demo pages NOINDEX
- enable Vercel Web Analytics
- keep Growth Autopilot evidence thresholds
- add experiment guardrails for bounce/error/revenue quality
- measure organic impressions → qualified search → referral → conversion

Exit gate: indexed pages have real impressions/clicks and no commercial page is indexed from synthetic inventory.

## OMEGA-9 · Autonomous company runtime — STRONG BUT NOT 10/10

- keep actor/judge separation
- keep hard global and per-role budgets
- prompt/policy/action-policy versions are persisted on every governed run; concrete actor/judge model IDs are recorded in the operations audit
- every proposed action has a deterministic scoped idempotency key
- executed safe actions persist tool-result evidence hashes
- per-action kill switches and the global emergency stop are implemented
- bounded model-call timeouts and provider/model fallback policy are implemented
- deterministic replay/simulation is implemented without spending model tokens
- adversarial replay suite covers:
  - fabricated price/availability
  - prompt injection
  - self-approval
  - authority escalation
  - duplicate action
  - spend escalation
- expand auto-actions only after replay evidence:
  - supply refresh may become automatic inside provider quotas
  - SEO/growth audits remain automatic
  - reconciliation remains automatic
- contracts, legal commitments, prices, outbound hotel agreements and material spend remain human authority

Exit gate: agents can be replayed, audited, stopped and proven not to exceed authority under adversarial tests.

## OMEGA-10 · Resilience / disaster recovery — NOT PROVEN

- Neon PITR/backups enabled
- quarterly restore drill
- database connection exhaustion test
- provider timeout/429/500/network recovery tests are implemented in CI; live partner outage drill remains unproven
- AI outage tests prove Gateway → OpenRouter recovery, OpenRouter primary → free-model fallback, and fail-closed no-paid-fallback policy; live outage drill remains unproven
- queue retry/backoff and poison-message audit strategy are implemented; failure drill remains unproven
- durable per-slot cron claims and DB idempotency tests are implemented; duplicate-delivery production drill remains unproven
- production rollback drill
- RPO/RTO documented
- incident runbook links to one-click rollback/revoke procedures

Exit gate: Atlas has demonstrated recovery from DB, provider, AI and bad-deploy failures.

## OMEGA-11 · Performance, accessibility and UX quality — PARTIAL

- capture real Core Web Vitals
- set p75 LCP/INP/CLS budgets
- Lighthouse CI or equivalent regression budget
- Chromium, Firefox and WebKit E2E run in CI
- WCAG 2.2 AA audit
- keyboard-only critical path
- screen-reader labels for planner/map/results
- load test public read paths and rate-limited write paths
- validate mobile devices with slow network/CPU
- search zero-result rate and trackable-session abandonment are derived from consented search/referral telemetry and surfaced in Control Tower

Exit gate: real-user performance and accessibility meet documented budgets, not just local screenshots/E2E.

## OMEGA-12 · Venture / business proof — NOT SOFTWARE

- choose north-star metric: qualified long-stay referrals or confirmed long-stay bookings
- measure funnel:
  - visitor
  - planner/search
  - live-offer view
  - referral click
  - confirmed booking
  - settled commission
- establish supply density per destination
- calculate CAC by channel
- calculate revenue per qualified visitor
- calculate booking value and take rate
- calculate contribution margin after AI/provider/hosting/support costs
- measure repeat usage / saved-plan return rate
- track direct-vs-OTA margin
- establish 3-, 6- and 12-month targets
- keep board/VC dashboard separate from synthetic software proof

Exit gate: Atlas can show repeatable demand, supply and unit economics. No engineering score can substitute for this gate.

## Definition of 10/10

Atlas is 10/10 only when all of the following are simultaneously true:

1. production deployment is exact-SHA verified and protected by required checks
2. Neon is reachable, preview-isolated and restore-tested
3. no HIGH/CRITICAL known runtime dependency vulnerability is accepted without explicit exception
4. edge + application security controls are active and observed
5. legal/privacy launch gates are complete
6. real SELLABLE supply exists
7. at least one real conversion has reconciled to settled revenue
8. autonomous actions are replay-tested, bounded and kill-switchable
9. production has SLOs/alerts and recovery drills
10. the final domain has live search/indexing evidence
11. real-user performance/accessibility meet budgets
12. demand and unit economics are measured from real users

The target is not “zero human involvement.” The target is a company whose routine operation is automated, whose irreversible authority is deliberately bounded, and whose business truth is externally evidenced.
