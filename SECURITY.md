# Security policy

## Secrets

Credentials belong in deployment environment variables only. `.env*` files are ignored except `.env.example`, which must contain placeholders only.

CI scans tracked files for known high-risk credential formats before dependency installation. A detected credential blocks the build. Production dependencies are audited at HIGH severity or above.

## Commercial truth

Prices, availability, provider identity, fulfilment capability, click attribution and commissions are deterministic business data. LLM output cannot promote any of them.

## Provider access

Missing credentials mean `DISABLED`. Credentials alone do not mean `COMMERCIAL_READY`; provider-specific gates such as prebook, pricing model and mTLS still apply.

## Internal operations

Control pages use a signed, HttpOnly ops session derived from `OPS_ACCESS_KEY`. Operational APIs accept that same-origin signed session or explicit bearer authentication for automation. Cron endpoints use `CRON_SECRET`. Unauthorized read surfaces should avoid disclosing internal state.

## AI authority

The model runtime is governed by role allowlists, independent-judge requirements, idempotency keys, cost limits, adversarial replay, durable cron claims, and global/per-action kill switches. Material spend, contracts, legal commitments and unsafe publication are not autonomous authority.

OpenRouter is the preferred runtime. When `AGENT_ALLOW_PAID_FALLBACK=false`, loss of the OpenRouter credential fails closed rather than silently switching to a paid model.

## Incident handling

If a credential is suspected to have entered repository history, revoke it at the provider, remove it from current source, audit history and downstream logs, and add a regression signature to the secret scanner.


## Deployment truth

Production is Git-linked to the canonical Vercel project. A source commit is considered production-proven only when:

1. CI, dependency audit, migration proof, typecheck, tests, build and E2E pass.
2. CodeQL passes.
3. the stable production alias exposes the expected application SHA, or the verifier proves that only non-runtime files were skipped.
4. the production smoke passes against the resolved application SHA.
5. when the agent runtime is configured, the smoke obtains a real judged completion from the expected provider.

Database migrations run automatically during Vercel build when a database URL is configured. They are serialized with a Postgres advisory lock and tracked by filename plus SHA-256 checksum.

## Data minimization

Anonymous saved-stay memory uses an opaque UUID cookie, is capped, expires through the retention workflow, and supports self-service deletion. Saved-memory API responses are `no-store`.

## Vulnerability reporting

Prefer GitHub's private vulnerability-reporting / Security Advisory flow when the repository UI exposes **Report a vulnerability**. Do not post exploit details, credentials, personal data, or unredacted production evidence in a public issue.

If private reporting is unavailable, contact the repository owner through a private GitHub-supported channel first and disclose only enough information to establish a secure reporting path. Public issues may be used for non-sensitive hardening requests only.

Security reports should include the affected surface, impact, reproduction prerequisites, and a minimal proof that avoids destructive actions or access to third-party data.
