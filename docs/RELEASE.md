# Release and activation checklist

Atlas has three separate states. Do not collapse them.

## 1. Mergeable

Required:
- secret scan passes
- npm ci passes
- TypeScript passes
- unit tests pass
- Next build passes
- Playwright desktop + mobile passes

A mergeable build may still have zero commercial inventory and zero production credentials.

## 2. Deployable

Required:
- all mergeable gates
- GitHub Actions VERCEL_TOKEN exists
- canonical Vercel project is linked
- production env can be pulled by Vercel CLI
- production DATABASE_URL exists
- migrations 001–008 apply successfully
- exact CI-tested master SHA is built and deployed
- production smoke passes

A deployable system may still be commercially inactive.

## 3. Commercially active

Required:
- legal operator identity configured
- OPS_ACCESS_KEY and CRON_SECRET configured
- at least one valid commercial supply lane is active:
  - fresh provider inventory, or
  - verified + published direct hotel contract
- conversion ingestion/reporting path is configured for the active commercial lanes
- disclosure page is reachable
- SEO indexing remains disabled until evidence-backed live pages qualify
- jurisdiction-specific review is completed before bundling accommodation with transport, insurance, or other travel services

## Rollback rule

A deployment, provider wave or direct rate that loses evidence must degrade to unavailable/noindex rather than fall back to an unverified commercial claim.

## Human authority

Agents may propose and judge artifacts. Humans retain authority for:
- contract signature
- material spend
- legal commitments
- commercial publication approval where required
- incident escalation and rollback decisions
