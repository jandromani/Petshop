# Atlas Long Stay

Atlas turns recurring monthly income into a long-stay living plan: compare 30–180 day stays by monthly cost, build 365-day routes, and expose commercial offers only when deterministic evidence gates pass.

## What is real today

- **Money Truth**: monthly resources → explicit reserve → maximum living budget → actual route cost.
- **Truth-gated supply**: demo scenarios and live commercial inventory are never silently mixed.
- **Direct Hotel OS**: verified direct hotel contracts can enter the same live catalogue as OTA/provider inventory. Booking, RateHawk and HBX are optional accelerators, not launch blockers.
- **Money OS**: referral lineage, conversion ingestion, commission/revenue reconciliation and settlement state.
- **SEO autopilot**: demo content stays NOINDEX. Supported live discovery pages become indexable automatically only after fresh SELLABLE evidence, geographic evidence and unique narrative gates pass.
- **Growth autopilot**: consented experiment data can deterministically promote a winning hero only after minimum sample and uplift thresholds.
- **Governed agents**: bounded roles, deterministic truth/authority judges, a downstream independent-model judge, adversarial replay, per-agent quotas, daily cost cap, persistent action ledger and allowlisted actuation.
- **Human authority boundary**: contracts, prices, hotel outreach, paid spend and code changes never auto-execute.
- **Control Tower**: runtime supply, referrals, revenue, incidents, experiments, agent runs and action state.
- **Git-native production**: Vercel is linked directly to `jandromani/Petshop` on `master`; production verification checks that the exact CI-tested SHA is live.

## Runtime modes

Atlas intentionally fails closed.

| Dependency | Without it | With it |
| --- | --- | --- |
| `DATABASE_URL` | consumer demo works; durable business loops remain off | migrations auto-run during Vercel build; sharing, ledgers, direct supply, governance and autopilots become durable |
| Vercel AI Gateway / OIDC | deterministic product continues | concierge + governed workforce activate without a long-lived model API key |
| Booking / RateHawk / HBX | direct hotel supply still works | broader automated inventory |
| real hotel contract | no commercial claim is created | verified rate can become LIVE after authenticated review |
| real traffic | no growth winner is invented | Growth Autopilot can act after evidence thresholds |
| real live inventory | SEO stays NOINDEX | evidence-backed pages can index automatically |

## Production bootstrap

The Vercel project is **`atlas-living`** under team **`jandromanis-projects`**, linked to this repository's `master` branch.

The production build command is:

```bash
npm run vercel-build
```

It runs database migrations only when `DATABASE_URL` exists, then performs the Next.js build. Migrations are idempotent and currently run through `db/015_scheduled_run_claims.sql`.

## Required commercial activation still outside the repository

1. Provision a production Postgres/Neon database and expose `DATABASE_URL`.
2. Configure legal operator name + contact email before commercial launch.
3. Add at least one verified direct hotel contract **or** provider credentials.
4. Attach the final custom domain and replace the temporary canonical URL.
5. Move the Vercel team to a commercial plan before monetized production use if required by the current plan terms.

Do not call an implemented software path "LIVE" until external runtime evidence exists. `/system` and `/api/health` deliberately distinguish synthetic software proof from production, supply and revenue proof.

See [docs/ROADMAP.md](docs/ROADMAP.md) and [docs/RELEASE.md](docs/RELEASE.md).
