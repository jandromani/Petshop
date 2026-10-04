# Production evidence — 2026-10-04

This file records operational facts that were directly observed against the linked Vercel project. It does not convert missing commercial evidence into software proof.

## Exact production state

- Project: `atlas-living` (`prj_8IQcscb47pks4JX2IdOtPbvA5qVJ`)
- Production SHA after recovery: `4cbbe6215cbf629fabfa39293749a0c8dbced35c`
- Production deployment: `dpl_6vWtWMwdvyQSchnQH4bp5gRokoJj`
- Public health returned HTTP 200 after restoration.
- Runtime error query for the preceding hour returned no error clusters.
- Persistent database remained intentionally unconfigured: `databaseConfigured:false`.

## Controlled rollback drill

The rollback drill used Vercel's production rollback API and the immediately previous READY production deployment, which is the rollback depth available on the Hobby plan.

1. Starting production: #67 / `4cbbe6215cbf629fabfa39293749a0c8dbced35c`.
2. Rolled back to #66 / `fd81e60cee49b793f98ee2bcdc104203d150ca01`.
3. `/api/health` returned HTTP 200 and reported the #66 SHA.
4. Restored production to #67.
5. `/api/health` returned HTTP 200 and reported `4cbbe6215cbf629fabfa39293749a0c8dbced35c`.
6. Runtime error aggregation after restoration reported no errors.

This proves the current Vercel rollback/recovery path. It does not prove database restore/PITR, which remains blocked on a real Neon production connection.

## Platform limits observed

The Hobby account reached the Vercel API deployment quota of 100 deployments/day on 2026-10-04. Vercel reported reset at 2026-10-05 16:54 Madrid time. Repository work after that observation is intentionally held in unmerged PRs so `master` remains equal to the production SHA until deployment capacity returns.

## External gates

See GitHub issue #68 for Neon binding, branch protection, WAF, Web Analytics, legal identity, final domain, real supply and revenue activation.
