# Autonomous operating runtime

## Principle

Use deterministic code for deterministic business facts. Use durable workflows for multi-step operations. Use agents only where interpretation or synthesis adds value.

## Durable workflows

### Supply Wave
`cron → workflow → acquisition step → sellability gate → result`

A crash between steps must not require re-running completed durable work.

### Daily Control
`cron → collect signals → human agenda`

The agenda is designed around a human-attention budget below 60 minutes/day.

## Agent boundary

Workflow is not an agent. A workflow owns process state and retries. An agent may be called from a workflow step when a bounded judgment or synthesis task is required, but an external judge and deterministic gates remain downstream.

## Current bootstrap state

The workflow substrate is real. Supply is still seed/mock until provider credentials are connected. Production persistence and conversion ingestion remain external dependencies.
