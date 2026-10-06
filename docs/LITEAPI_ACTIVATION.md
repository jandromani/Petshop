# LiteAPI: bounded activation

The REST adapter and private Hotel Desk probe are implemented. LiteAPI is not a
public sellable provider: it has no active prebook/payment/confirmation lane here.
Adding an API key never changes that invariant.

## Configure and verify

1. Obtain the hotel's distribution credentials from the LiteAPI dashboard. The
   account holder must review the provider terms; this repository creates no account.
2. Add `LITEAPI_API_KEY` as a private Vercel environment variable. Never use a
   `NEXT_PUBLIC_` prefix or put it into Git, screenshots, request URLs or chat.
3. Set `LITEAPI_ENVIRONMENT=sandbox` for test credentials, or explicitly
   `production` for production credentials. Redeploy after configuration.
4. Sign into Atlas operations and open `/hotel-desk`. Choose city, ISO country,
   guest nationality, dates, 30/60/90 nights, one room with 1/2 adults and currency.
5. Run one whole-stay availability check. Inspect the requested checkout date,
   observed timestamp and supplier totals. Repeat for another duration only when
   needed. A zero-result response is valid evidence of no quoted availability,
   not proof that a hotel or destination has no rooms.

`POST /api/providers/liteapi/probe` requires operations authentication. It calls
only `POST https://api.liteapi.travel/v3.0/hotels/rates`, with a 10-hotel cap,
6-second supplier timeout, no automatic retries and six probes/minute. No Places,
price-index, payment, booking or cancellation endpoint is called. Supplier errors
are not echoed to clients; credentials stay server-side. Responses are private,
not cached, and not inserted into public inventory.

## Publication work still required

- Prove actual 30, 60 and 90 night supplier availability with production credentials.
- Confirm distribution rights, SSP/CUG constraints, taxes/fees and cancellation terms.
- Implement server-owned offer sessions, prebook revalidation, provider-hosted
  payment tokenization, booking idempotency, confirmation and failure reconciliation.
- Preserve Atlas attribution and cancellation/commission evidence.
- Independently review an end-to-end sandbox booking before activating production.

Search totals are whole-stay observations. They are never a nightly teaser
multiplied by a month, a public guaranteed price, a contract or platform revenue.

## Primary references, checked 2026-10-06

- Rates endpoint: https://docs.liteapi.travel/reference/post_hotels-rates
- Response and pricing semantics: https://docs.liteapi.travel/docs/hotel-rates-api-json-data-structure
- API costs and fair-use conditions: https://docs.liteapi.travel/reference/api-pricing-usage-costs
- Revenue, payment and distribution: https://docs.liteapi.travel/docs/revenue-management-and-commission
- Official SDK used as reference only: https://github.com/liteapi-travel/nodejs-sdk

Core booking APIs are advertised as free subject to provider terms and reasonable
usage. Optional endpoints and dashboard services can be paid. API access does not
cause hotels to pay Atlas; commercial agreements and completed business do.
