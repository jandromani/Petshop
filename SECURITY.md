# Security policy

## Secrets

Credentials belong in deployment environment variables only. `.env*` files are ignored except `.env.example`, which must contain placeholders only.

CI scans tracked files for known high-risk credential formats before dependency installation. A detected credential blocks the build.

## Commercial truth

Prices, availability, provider identity, fulfilment capability, click attribution and commissions are deterministic business data. LLM output cannot promote any of them.

## Provider access

Missing credentials mean `DISABLED`. Credentials alone do not mean `COMMERCIAL_READY`; provider-specific gates such as prebook, pricing model and mTLS still apply.

## Internal operations

Control and operational endpoints require `OPS_ACCESS_KEY` and should return 404 rather than disclose internal state when unauthorized.

## Incident handling

If a credential is suspected to have entered repository history, revoke it at the provider, remove it from current source, audit history and downstream logs, and add a regression signature to the secret scanner.
