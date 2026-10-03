# HBX commercial funnel

HBX availability is not flattened into a generic provider result.

## State machine

`AVAILABILITY → (BOOKABLE | RECHECK) → CHECKRATE when required → BOOKING_CAPABLE`

- `rateKey` is the provider offer identity.
- `RECHECK` rates cannot cross the Truth Gate until CheckRate returns fresh information.
- `BOOKABLE` rates can skip CheckRate, but Petshop still requires actual booking capability before marking an API-only offer sellable.
- `HBX_BOOKING_ENABLED=true` and `HBX_MTLS_READY=true` are explicit commercial gates.

## Price truth

`sellingRate` is accepted as display price when supplied.

`net` is never silently shown to the customer. Under a net pricing model, `HBX_MARKUP_PERCENT` must be explicitly configured before a display price can be derived.

This protects both margin and consumer-price truth.

## Transport security

HBX requires mutual TLS for Hotel Booking API operations. The environment flag is a readiness gate, not an mTLS implementation by itself; production networking/certificate deployment must still be verified before enabling booking.
