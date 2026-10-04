# Atlas incident runbook

## Severity

- **SEV-1**: commercial truth violation, secret exposure, data integrity loss, widespread outage, unauthorized spend/action.
- **SEV-2**: major provider outage, persistent conversion attribution failure, database degradation, repeated agent failures.
- **SEV-3**: localized bug, stale non-commercial page, degraded analytics, recoverable job failure.

## First actions

1. Freeze unsafe automation with `AGENT_EMERGENCY_STOP=true`.
2. Revoke or rotate the relevant secret if compromise is suspected.
3. If a bad deploy is implicated, rollback to the last verified production deployment.
4. If commercial evidence is stale or uncertain, degrade to unavailable/noindex rather than preserve a CTA.
5. Record incident key, first observed time, scope, current owner and evidence links.

## Database

- If `DATABASE_URL` exists but the probe fails, treat durable writes as unavailable.
- Do not fall back to demo inventory for commercial claims.
- Inspect Neon compute/branch state and connection exhaustion.
- For suspected corruption, stop writes and follow `DR_RUNBOOK.md`.

## AI / agent runtime

- Global stop: `AGENT_EMERGENCY_STOP=true`.
- Per-action switches can disable one auto-action without shutting down the whole runtime.
- Material actions remain human authority even without the stop.
- Every executed safe action must have an idempotency key and evidence hash.

## Supply/provider outage

- Provider 429/5xx must not create SELLABLE inventory.
- Existing evidence expires naturally by TTL.
- Direct offers remain independent if their contract evidence is valid.

## Money/reconciliation

- Never synthesize a conversion or commission to close a gap.
- Keep unmatched conversions as anomalies.
- Cancellation/reversal must remain explicit lifecycle states.

## Closure

An incident closes only when:
- customer/commercial truth is restored,
- root cause is identified,
- the mitigation is verified,
- follow-up work is tracked,
- secrets are rotated when applicable,
- and the system has returned to evidence-backed operation.
