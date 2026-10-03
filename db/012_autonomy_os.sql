create table if not exists runtime_config (
  config_key text primary key,
  value jsonb not null,
  source text not null,
  evidence jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);

alter table agent_tasks add column if not exists action_kind text;
alter table agent_tasks add column if not exists action_payload jsonb not null default '{}'::jsonb;
alter table agent_tasks add column if not exists execution_state text not null default 'NOT_REQUESTED';
alter table agent_tasks add column if not exists execution_result jsonb not null default '{}'::jsonb;
alter table agent_tasks add column if not exists executed_at timestamptz;

create index if not exists agent_tasks_execution_state on agent_tasks(execution_state,created_at desc);
