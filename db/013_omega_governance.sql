alter table agent_runs add column if not exists policy_version text;
alter table agent_runs add column if not exists prompt_version text;
alter table agent_runs add column if not exists action_policy_version text;

alter table agent_tasks add column if not exists idempotency_key text;
alter table agent_tasks add column if not exists execution_evidence_hash text;
alter table agent_tasks add column if not exists policy_version text;
alter table agent_tasks add column if not exists action_policy_version text;

create unique index if not exists agent_tasks_idempotency_key_unique
  on agent_tasks(idempotency_key)
  where idempotency_key is not null;

create index if not exists agent_runs_policy_version_idx
  on agent_runs(policy_version,started_at desc);
