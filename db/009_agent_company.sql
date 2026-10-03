create table if not exists agent_tasks (
  id uuid primary key default gen_random_uuid(),
  source_signal text not null,
  agent_key text not null,
  objective text not null,
  context jsonb not null default '{}'::jsonb,
  agent_run_id uuid references agent_runs(id) on delete set null,
  artifact text,
  judge_summary jsonb not null default '{}'::jsonb,
  status text not null default 'PROPOSED',
  created_at timestamptz not null default now(),
  reviewed_at timestamptz,
  reviewer text,
  review_note text
);

create index if not exists agent_tasks_status_created on agent_tasks(status,created_at desc);
create index if not exists agent_tasks_signal on agent_tasks(source_signal,created_at desc);
