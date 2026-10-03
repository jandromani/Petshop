# Atlas architecture

## Prime directive

> Nothing reaches the customer because we found it. It reaches the customer because we proved it.

## Planes

1. **Attention / Growth** — SEO, SEM, social, shareable routes, experiments.
2. **Experience / Intent** — retirement budget, route builder, destination exploration.
3. **Referral / Money** — impression → click_id → provider redirect → conversion → commission.
4. **Supply / Truth** — provider APIs, raw evidence, normalization, quote verification, sellability.
5. **Agentic Operations** — agents discover, explain, propose, enrich, contact and optimize.
6. **External Judges** — truth, SEO, brand, conversion, security and reliability judges outside actor flows.

## Deterministic core, agentic perimeter

LLMs must never be the system of record for:
- prices
- availability
- commission
- click attribution
- provider identity
- sellability
- legal / residence rules

Agents can create candidate work. Deterministic gates and independent judges decide promotion.

## Service-ready bounded contexts

The first release is a modular monolith for speed. Boundaries are deliberately shaped so they can move to independent services later:

- supply
- identity
- pricing
- verification
- referral
- attribution
- routing
- growth
- agents
- judges

## Event vocabulary

hotel.discovered
hotel.normalized
hotel.identity.resolved
quote.requested
quote.verified
hotel.sellable
offer.viewed
referral.clicked
conversion.received
commission.confirmed
seo.opportunity
experiment.completed
agent.alert

## Acquisition waves

Provider ingestion runs in bounded waves (region × dates × stay length). Each wave must emit counts for raw, canonical, quote-tested, sellable, stale and quarantined records.

## Human attention budget

Target: < 60 minutes/day. Humans govern contracts, material spend, legal commitments and exceptional escalations; agents operate within budgets.
