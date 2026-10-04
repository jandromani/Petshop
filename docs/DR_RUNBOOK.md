# Atlas disaster recovery runbook

## Targets

Initial engineering targets until commercial SLOs are approved:

- **RPO**: <= 15 minutes for durable commercial/attribution state.
- **RTO**: <= 60 minutes for the public read experience; <= 4 hours for durable commercial operations.

These are targets, not claims. They become proven only after a restore drill.

## Database failure

1. Set `AGENT_EMERGENCY_STOP=true`.
2. Confirm `/api/health` reports `databaseReachable:false`.
3. Stop any manual commercial publication/reconciliation.
4. Restore Neon to a new branch/database using PITR/backups.
5. Run migrations using the unpooled/direct connection.
6. Verify `atlas_schema_migrations` checksums.
7. Run health + system proof + direct supply/revenue integrity queries.
8. Point runtime to the recovered database.
9. Re-enable automation only after evidence is green.

## Bad deployment

- Production is Git-linked and exact-SHA verified.
- Roll back to a previously READY production deployment.
- Re-run smoke checks.
- Scan runtime errors after rollback.

## Provider outage

- Do not extend TTL or reuse stale provider evidence.
- Allow affected offers to become unavailable.
- Direct Hotel OS continues independently when valid.

## AI Gateway outage

- Public deterministic planner remains functional.
- Governed agents fail closed.
- Do not weaken judge independence to restore availability.

## Required drills

Before declaring resilience 10/10:
- Neon point-in-time restore.
- database connection exhaustion.
- provider 429 and 500.
- AI Gateway unavailable.
- duplicate cron/event delivery.
- production rollback.
- queue retry / poison-message handling.

Record drill date, observed RPO/RTO, failures and remediation in an operations evidence record.
