# Live acquisition evidence pipeline

The first production-capable acquisition wave uses Booking Demand API v3.2.

## Pipeline

`destination anchor → live search → details enrichment → raw evidence hash → canonical hotel → offer snapshot → Truth Gate → sellability audit`

A provider HTTP 200 is never enough to publish an offer.

For a Booking referral offer to become `SELLABLE`, the evidence must include live source mode, provider identity, product-level offer ID, positive display price, ISO currency, dates, verification timestamp, immutable raw evidence hash, and a commercial redirect URL.

The durable starter is `POST /api/workflows/booking-live`. It is intentionally not on a cron until partner credentials, quotas and production constraints are known.

Raw provider payloads and Truth Gate outcomes are persisted separately. This allows forensic replay when parsing or commercial rules change.

Seed catalogue records remain `DEMO` and can never be promoted by this workflow.
