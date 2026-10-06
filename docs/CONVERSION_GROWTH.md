# Conversion and acquisition release

## User journey

English and Spanish use the same functional search, real hotel records, list/map state, saved hotels, comparison (up to three), quote request and private tracking. Dates, duration, guests and target budget travel into the request. A request is free; acceptance means continuing to a booking option, not a confirmed booking or payment.

- `/stays`, `/es/stays`: canonical unfiltered discovery; public filter URLs restore search state.
- `/compare`, `/es/compare`: same-date comparison. Unknown meals, facilities or cancellation remain unknown.
- `/requests`, `/es/requests`: private, cookie-owned data, never indexed. Email access tokens are exchanged from a URL fragment, then removed before loading requests. Database stores only token hashes. Email access expires after 90 days and browser access after eight hours.
- `/s/<token>`: public, 90-day shared search/selection. Only approved filters and hotel IDs are saved; no email, access token, UTM or paid-click identifiers. Single selections open the hotel. Native sharing falls back to clipboard and full filter URLs if short-link persistence is unavailable.

## Pricing and contact

Operations must attach a currently sellable offer matching the exact normalized hotel name, city, country, date, duration and occupancy. Matching is repeated before email and before continuation. Merchant prices also require activated Stripe and allocated inventory. No operator action or LLM invents prices.

`/hotel-desk` accepts a verified offer ID per request. `/control` links to supply and acquisition desks. Receipt and quote email jobs persist independently. Each offer version has its own match job; stale quotes fail closed. Workers claim jobs with `FOR UPDATE SKIP LOCKED`, retry up to eight attempts and preserve provider idempotency. `SENT` means the email API accepted it, not delivery, an open or a customer response.

Activate transactional email by configuring `RESEND_API_KEY` and a verified `ATLAS_EMAIL_FROM`. Optional reply-to uses `LEGAL_CONTACT_EMAIL`. Existing queued jobs are retained while unconfigured. Immediate post-response draining is backed by daily `/api/cron/sourcing-email` at 06:30 UTC with the existing cron secret. Inspect queue state and provider delivery logs after activation; this release does not claim a real email delivery without that evidence.

## SEO

`SEO_PUBLIC_INDEXING=true` enables only the original homepage, hotel pilot and Tenerife / Gran Canaria guides in both languages. Preview deployments remain noindex. These eight approved pages have canonical URLs and reciprocal hreflang. The separate commercial indexing gate still requires current commercial evidence and its existing domain / verification prerequisites. Unpriced hotel listings, filtered discovery, private requests and shared selections are not added to the informational sitemap. Sitemap entries deduplicate when both gates open.

Search Console verification, a custom domain and Google measurement IDs still require actual account/operator input. Indexability is not evidence that Google has indexed a URL. Guides link to official sources; editorial review date is 6 October 2026.

## Promotion and SEM

`/growth-desk` requires an operator session and provides:

- Destination, material language, channel, campaign and creative controls.
- Social copy, search ad drafts, a 20-second product walkthrough storyboard and a downloadable SVG social card.
- UTM links and a downloadable campaign JSON pack with keywords and exclusions.
- Thirty-day requests, verified quotes, continuations and queued emails, with no invented purchases or revenue.
- A CSV of consented quote / continuation outcomes, including available Google click IDs, for mapping to the account's own Google Ads Data Manager actions. This is an internal export, not a direct-upload or automatic Ads integration.

First-touch UTM and click identifiers are stored on requests only after the current analytics consent. Shared URLs strip attribution and private data. Existing spend and booking ledgers remain the source for actual cost and paid booking outcomes.

The release does not send hotel outreach, post social content, launch ads or spend a budget. A finished narrated video, real advertising account conversion actions and a paid acquisition experiment remain operator execution steps; the code provides reviewable materials and attribution.

## Real commercial activation

Enter the real legal operator and contact, enable verified email, connect measurement accounts and agree a bounded campaign budget. Verify a hotel's representative, sign actual terms, approve the real rate and inventory, then test payment and hotel confirmation. A directory hotel is not a contracted customer. Applying to the pilot is free; commission, subscription or merchant fees require a separate real agreement.

## Verification

Migration 026 is additive. CI runs it twice against empty PostgreSQL and checks 26 applied migrations. New database tests exercise request ownership, token expiry, share redaction, exact verified quotes, stale pricing, independent continuation state and concurrent/versioned email jobs. Unit tests cover consented attribution, public versus commercial SEO, formula-safe CSV and email configuration. Browser tests cover Spanish search → comparison → request → tracking, campaign landing navigation, public sharing fallback, private acquisition endpoints and mobile overflow alongside the existing four-browser map and product suite.
