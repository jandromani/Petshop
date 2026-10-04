# Release and activation checklist

Atlas has four separate states. Do not collapse them.

## 1. Mergeable

Required:
- secret scan passes
- reproducible `npm ci` passes
- production dependency audit has no unaccepted HIGH/CRITICAL result
- TypeScript passes
- unit tests pass
- Next build passes
- Playwright desktop + mobile passes
- CodeQL/dependency review pass when applicable

A mergeable build may still have zero commercial inventory and zero production credentials.

## 2. Deployable

Required:
- all mergeable gates
- canonical Vercel project is linked directly to `Petshop/master`
- Git-linked production deployment exists
- exact CI-tested master SHA is the SHA observed on the stable production alias
- production smoke passes
- DB migrations run automatically if a database is attached
- migration runner serializes changes and rejects checksum drift

GitHub `VERCEL_TOKEN` is not required for the canonical Git-linked delivery path.

## 3. Durable runtime active

Required:
- `DATABASE_URL` exists
- the database health probe succeeds
- migrations 001–015 are recorded by the migration ledger
- governed agent/task/runtime state can persist
- cron and conversion secrets are configured
- scheduled daily workflow starts use durable per-slot claims to reject duplicate delivery
- preview environments do not write to production state

A durable runtime may still have zero commercial inventory.

## 4. Commercially active

Required:
- legal operator identity configured
- at least one valid commercial supply lane is active:
  - fresh provider inventory, or
  - verified + published direct hotel contract
- conversion ingestion/reporting path is configured for the active lane
- commercial disclosure/privacy/terms are complete
- SEO indexing remains evidence-gated
- jurisdiction-specific review is completed before bundling accommodation with transport, insurance, or other travel services

## Rollback rule

A deployment, provider wave or direct rate that loses evidence must degrade to unavailable/noindex rather than fall back to an unverified commercial claim.

## Human authority

Agents may propose, judge and execute explicitly allowlisted reversible actions. Humans retain authority for:
- contract signature
- material spend
- legal commitments
- publication of direct commercial terms where policy requires approval
- exceptional incident escalation and destructive rollback decisions

## OMEGA reference

See `docs/OMEGA_ROADMAP.md` for the 10/10 engineering, data, security, legal, resilience and venture gates.
