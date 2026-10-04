# Direct Hotel OS — onboarding evidence checklist

A hotel is not live because a salesperson or agent says it is. Publication requires deterministic commercial evidence. This is an operational checklist, not a legal agreement.

## 1. Counterparty identity

- legal hotel / operating company name
- property trading name and address
- authorized commercial contact
- contract/reference identifier
- effective and expiry/renewal dates

## 2. Long-stay rate evidence

Every proposed rate must state:

- room / rate-plan identifier
- valid-from and valid-to
- eligible check-in window
- minimum and maximum nights
- supported occupancy
- board basis
- total or monthly-equivalent price
- native currency
- taxes/mandatory charges treatment
- cancellation/no-show terms
- inventory/allotment limitations where applicable

A marketing headline, nightly teaser, stale screenshot or LLM output is never sufficient price evidence.

## 3. Fulfilment path

Before publication:

- booking URL uses HTTPS
- approved booking hostname is stored separately
- URL host matches the approved host
- tracking parameter / attribution mechanism is documented
- booking flow identifies the property/rate being purchased
- an enquiry-only path is never labelled instant booking

## 4. Commercial economics

Keep the customer price separate from Atlas economics:

- commission type: percentage or fixed
- commission value and fixed-commission currency
- effective-from / effective-to
- cancellation/reversal treatment
- settlement cadence
- hotel/provider booking reference usable for reconciliation

## 5. Truth-gate publication

A direct rate may become public only when:

1. contract/reference evidence exists,
2. the requested stay fits the validity window,
3. occupancy and stay-length constraints match,
4. booking URL + approved host pass validation,
5. publication state is explicitly `LIVE`,
6. contract verification is true,
7. the offer is not expired.

Missing or stale evidence degrades to unavailable. Atlas never replaces missing commercial evidence with a demo CTA.

## 6. Re-verification

- Re-check before validity expires.
- Re-check immediately after rate, cancellation, URL, commission or inventory changes.
- Hotel-requested suspension is immediate.
- Never auto-extend a commercial validity window from historical success.

## 7. First-property acceptance evidence

Retain:

- source contract/reference
- normalized direct-rate record
- truth-gate result
- public detail URL
- referral-path test evidence
- one booking-path traversal that stops before purchase
- named human publication approver

## 8. Scale gate

- 1 real verified hotel proves the lane.
- At least 10 fresh SELLABLE direct offers across 3+ destinations is the initial supply-density gate.
- Demo catalogue entries never count.
