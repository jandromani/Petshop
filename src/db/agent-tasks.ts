import { getDatabase } from "@/src/db/client";
import type { AgentKey } from "@/src/agents/registry";

export async function createAgentTask(input:{
  sourceSignal:string;
  agentKey:AgentKey;
  objective:string;
  context?:unknown;
  agentRunId?:string;
  artifact?:string;
  judgeSummary?:unknown;
}){
  const sql=getDatabase(); if(!sql)return null;
  const rows=await sql<{id:string}[]>`
    insert into agent_tasks (source_signal,agent_key,objective,context,agent_run_id,artifact,judge_summary,status)
    values (
      ${input.sourceSignal},${input.agentKey},${input.objective},
      ${sql.json((input.context||{}) as never)},
      ${input.agentRunId ?? null}::uuid,
      ${input.artifact ?? null},
      ${sql.json((input.judgeSummary||{}) as never)},
      'PROPOSED'
    )
    returning id::text
  `;
  return rows[0]?.id??null;
}

export async function reviewAgentTask(input:{id:string;status:"APPROVED"|"DISMISSED";reviewer:string;note?:string}){
  const sql=getDatabase();if(!sql)return false;
  const rows=await sql<{id:string}[]>`
    update agent_tasks
    set status=${input.status},reviewed_at=now(),reviewer=${input.reviewer},review_note=${input.note ?? null}
    where id=${input.id}::uuid and status='PROPOSED'
    returning id::text
  `;
  return Boolean(rows[0]);
}

export async function listAgentTasks(limit=50){
  const sql=getDatabase();if(!sql)return[];
  const bounded=Math.max(1,Math.min(200,limit));
  return sql<Array<{
    id:string;sourceSignal:string;agentKey:string;objective:string;artifact:string|null;
    status:string;createdAt:string;reviewedAt:string|null;
  }>>`
    select id::text,source_signal as "sourceSignal",agent_key as "agentKey",objective,artifact,status,
      created_at::text as "createdAt",reviewed_at::text as "reviewedAt"
    from agent_tasks
    order by case status when 'PROPOSED' then 0 else 1 end,created_at desc
    limit ${bounded}
  `;
}
