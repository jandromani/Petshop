# Search Console activation runbook

Atlas keeps programmatic SEO fail-closed until the public domain and Google ownership proof are deliberate.

## Software already wired

- Root metadata reads `GOOGLE_SITE_VERIFICATION` and emits the Google verification meta tag.
- `/robots.txt` exposes the sitemap only for a public site URL.
- `/sitemap.xml` includes evidence-gated destination pages and truth-gated commercial discovery pages.
- Destination pages use canonical URLs and Hotel/ItemList structured data without inventing prices.
- `SEO_LIVE_INDEXING=auto` opens only when:
  1. `NEXT_PUBLIC_SITE_URL` is a custom domain (not localhost or `*.vercel.app`), and
  2. `GOOGLE_SITE_VERIFICATION` is configured.
- `SEO_LIVE_INDEXING=true` is an explicit operator override. Keep `auto` for launch.

## Activation

1. Attach the final custom domain to the Vercel project and make it canonical.
2. Set production `NEXT_PUBLIC_SITE_URL=https://<domain>`.
3. In Google Search Console create the property.
4. Prefer DNS verification for a Domain property. If using URL-prefix HTML-tag verification, copy only the token value into production `GOOGLE_SITE_VERIFICATION`.
5. Deploy once.
6. Verify page source on the public home page contains `google-site-verification`.
7. Verify `/robots.txt` and `/sitemap.xml` return 200 on the canonical host.
8. Complete ownership verification in Search Console.
9. Submit `https://<domain>/sitemap.xml`.
10. Keep `SEO_LIVE_INDEXING=auto`; Control Tower should move from FAIL CLOSED to INDEXING OPEN.
11. Inspect representative destination URLs before widening indexing.

Never copy a Search Console verification token into Git or public documentation.