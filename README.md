# Atlas Long Stay

Atlas is building the distribution layer for hotel stays measured in **months, not nights**.

The initial consumer wedge is deliberately narrow: **one destination, one monthly accommodation budget, 30 / 60 / 90 days**. Winter-sun demand and the Canary Islands are the first commercial focus. Atlas separates three claims that ordinary travel search often blurs together:

1. **Hotel identity** — a real property can be searched.
2. **Commercial supply** — a current rate exists with a valid fulfillment path.
3. **Verified price** — fresh evidence supports the price shown for the requested stay.

A searchable hotel is therefore **not** counted as contracted inventory.

## The commercial loop

`search → verify → source → quote → booking → attribution`

- If current sellable evidence exists, Atlas shows the verified monthly-equivalent rate.
- If it does not, the traveller can create a **private-rate sourcing case** for 30, 60 or 90 days.
- Atlas attempts commercially configured providers and keeps **Direct Hotel OS** as the hotel-sourcing fallback.
- The sourcing case stores explicit quote-contact consent and can return a receipt/matched-rate email when transactional email is configured.
- Atlas is designed around **transaction-aligned referral/distribution economics on eligible completed accommodation bookings**. Search and private-rate requests do not require a consumer subscription.

## What is real in the software

- **Truth-gated supply**: property identity, content rights and commercial price evidence are separate layers.
- **Private sourcing loop**: consumer demand becomes a durable sourcing case, provider probe and Direct Hotel OS lead.
- **Direct Hotel OS**: direct rates remain draft until contract evidence, validity, terms and booking-host controls clear publication.
- **Provider adapters**: Booking, RateHawk and HBX can broaden supply when commercially configured.
- **Managed Marketplace OS**: direct rates can graduate from referral to MERCHANT/EXCLUSIVE_MERCHANT only with contract evidence, hotel net, customer price, verified merchant terms and allocated inventory. Atlas Checkout reserves inventory before Stripe Checkout and records paid GMV/platform revenue from actual orders.
- **Money OS**: referral lineage, conversion ingestion, commission/revenue reconciliation, merchant GMV and acquisition-spend/CAC evidence.
- **Stay Readiness**: a deterministic Schengen 90/180 day engine distinguishes hotel nights from presence days, while tax-day screens remain explicitly non-determinative. Official sources remain the authority.
- **SEO evidence gates**: unsupported commercial pages stay NOINDEX; current sellable evidence controls indexability.
- **Governed agents**: LLMs help interpret intent and operate bounded workflows but cannot manufacture hotel facts, prices or authority.
- **Control Tower / System Proof**: runtime state distinguishes software readiness from real provider, supply, revenue and email-delivery activation.

## What Atlas is not claiming

- Searchable directory coverage is **not** contracted supply.
- A requested rate is **not** guaranteed availability.
- Prototype/demo data is **not** a live commercial offer.
- Ask Atlas is an interface, **not the moat**.
- A hotel reservation does **not** decide visa, residence, tax or health eligibility.
- Partner counts, bookings, GMV and revenue are not displayed unless runtime evidence exists.

## Runtime modes

Atlas intentionally fails closed.

| Dependency | Without it | With it |
| --- | --- | --- |
| `DATABASE_URL` | public discovery can render; durable sourcing/business loops remain off | migrations, sourcing, ledgers, direct supply and ops state become durable |
| `RESEND_API_KEY` + `ATLAS_EMAIL_FROM` | sourcing cases remain in the authorized ops queue | sourcing receipt + matched-rate email delivery activates |
| `ATLAS_MERCHANT_CHECKOUT_ENABLED` + Stripe secrets | managed rates remain discoverable but Atlas Checkout stays fail-closed | contract-verified merchant supply can create inventory-reserved Stripe Checkout sessions |
| Booking / RateHawk / HBX | provider-backed supply remains unavailable | targeted commercial sourcing can run through the configured adapter |
| verified direct hotel agreement | direct rate remains unpublished | rate can clear the Direct Hotel OS publication gate |
| real live inventory | commercial SEO remains evidence-gated | supported pages can become indexable |
| real conversions | no revenue claim is inferred | transaction attribution and reconciliation can report actual economics |

## Production bootstrap

The Vercel project is **`atlas-living`** under team **`jandromanis-projects`**, linked to this repository's `master` branch.

The production build command is:

```bash
npm run vercel-build
```

It runs idempotent database migrations when `DATABASE_URL` exists and then builds Next.js. The schema currently runs through **`db/022_managed_marketplace.sql`**.

## Commercial proof still outside the repository

Code cannot manufacture the evidence that closes the seed thesis. The remaining external proof is:

1. Configure the real operator identity/contact and production transactional email.
2. Activate at least one commercial provider **or** onboard direct hotel supply.
3. Prove a focused Canary Islands pilot with verified 30–90 day rates and at least one managed allocation.
4. Drive real private-rate requests through the sourcing loop.
5. Record completed bookings, merchant GMV, hotel cost, platform revenue and attributable paid spend.
6. Expand the same playbook only after the first destination loop is repeatable.

Do not call an implemented software path **LIVE** until external runtime evidence exists. `/system` and `/api/health` deliberately distinguish software proof from production, supply and revenue proof.

See `/about`, `/for-hotels`, `/stay-readiness`, `/methodology`, `/trust` and `/system` for the public thesis and evidence model.
