# AGENTS.md

Read `docs/CONSTITUTION.md` and `docs/ARCHITECTURE.md` before making changes.

## Non-negotiables

- Never commit credentials or copy API keys into source.
- LLM output is never source of truth for price, availability, commission, identity or sellability.
- Every external commercial claim needs provenance and freshness.
- Every outbound commercial click must pass through attribution.
- Actor agents cannot approve their own work.
- Keep business logic deterministic where deterministic code can solve the task.
- Changes that touch referral attribution, pricing, provider normalization or sellability require tests.
- Preserve the freedom-first brand. Avoid geriatric or fear-led language.

## Development gate

typecheck → unit tests → build → preview → E2E → promote.
