# Security policy

## Secrets

Credentials belong in deployment environment variables only. `.env*` files are ignored except `.env.example`, which must contain placeholders only.

CI scans tracked files for known high-risk credential formats before dependency installation. A detected credential blocks the build.

## Commercial truth

Prices, availability, provider identity, fulfilment capability, click attribution and commissions are deterministic business data. LLM output cannot promote any of them.

## Provider access

Missing credentials mean `DISABLED`. Credentials alone do not mean `COMMERCIAL_READY`; provider-specific gates such as prebook, pricing model and mTLS still apply.

## Internal operations

Control pages use a signed, HttpOnly ops session derived from `OPS_ACCESS_KEY`. Operational APIs accept that same-origin signed session or explicit bearer authentication for automation. Cron endpoints use `CRON_SECRET`. Unauthorized read surfaces should avoid disclosing internal state.

## Incident handling

If a credential is suspected to have entered repository history, revoke it at the provider, remove it from current source, audit history and downstream logs, and add a regression signature to the secret scanner.


## Deployment truth

A skipped deploy is not a successful deploy. Production automation must fail closed when deployment credentials are absent, run database migrations against the production environment, deploy the exact CI-tested source SHA, and smoke-test the resulting URL.

## Vulnerability reporting

Prefer GitHub's private vulnerability-reporting / Security Advisory flow when the repository UI exposes **Report a vulnerability**. Do not post exploit details, credentials, personal data, or unredacted production evidence in a public issue.

If private reporting is unavailable, contact the repository owner through a private GitHub-supported channel first and disclose only enough information to establish a secure reporting path. Public issues may be used for non-sensitive hardening requests only.

Security reports should include the affected surface, impact, reproduction prerequisites, and a minimal proof that avoids destructive actions or access to third-party data.
