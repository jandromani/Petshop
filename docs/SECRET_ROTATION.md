# Secret rotation policy

Atlas keeps credentials outside source control. Rotation is an operational control, not a code deployment claim.

## Standard cadence

| Secret class | Maximum routine age | Immediate rotation triggers |
| --- | ---: | --- |
| `OPS_ACCESS_KEY` | 90 days | suspected disclosure, operator departure, leaked logs/history |
| `CRON_SECRET` | 90 days | suspected disclosure, unauthorized cron traffic |
| `CONVERSION_INGEST_SECRET` | 90 days | suspected disclosure, unexplained conversion-ingest traffic |
| external AI/provider API credentials | 90 days or provider-required cadence, whichever is shorter | provider alert, repository/log exposure, unexplained spend/traffic |
| database privileged credentials | 90 days or managed-provider policy, whichever is shorter | suspected disclosure, unauthorized DB access |
| Vercel OIDC runtime tokens | managed/short-lived | rotate the trust/configuration rather than treating ephemeral tokens as static secrets |

A provider-managed credential with a demonstrably shorter automatic lifetime satisfies the routine-age requirement without manual churn.

## Rotation procedure

1. Identify every environment that uses the credential: Production, Preview, CI and local operator tooling.
2. Create the replacement credential without deleting the current credential when the provider supports overlap.
3. Update the secret in the deployment/provider control plane; never commit the value to Git.
4. Deploy or restart only the consumers that require it.
5. Verify the relevant health/probe using non-destructive requests.
6. Revoke the old credential.
7. Re-run the health/probe after revocation to prove no hidden consumer still depends on it.
8. Record date, secret class, operator, affected environments and evidence link. Never record the secret value.

## Emergency rotation

For suspected exposure, do not wait for the routine window. Freeze unsafe automation with `AGENT_EMERGENCY_STOP=true` when agent credentials or authority may be affected, revoke/replace the credential, inspect audit/runtime logs and follow `docs/INCIDENT_RUNBOOK.md`.

## Ownership

A real production operator must own the calendar and evidence log before commercial launch. Repository code can define the policy but cannot prove that an external provider credential was rotated.
