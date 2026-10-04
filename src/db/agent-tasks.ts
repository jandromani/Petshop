import { getDatabase } from "@/src/db/client";
import type { AgentKey } from "@/src/agents/registry";
import type { AgentActionKind } from "@/src/agents/actions";

export async function createAgentTask(input:{
  sourceSignal:string;
  agentKey:AgentKey;
  objective:string;
  context?:unknown;
  agentRunId?:string;
  artifact?:string;
  judgeSummary?:unknown;
  actionKind?:AgentActionKind|null;
  actionPayload?:unknown;
  idempotencyKey?:string|null;
  policyVersion?:string|null;
  actionPolicyVersion?:string|null;
}){
  const sql=getDatabase(); if(!sql)return null;
  const rows=await sql<{id:string}[]>`
    insert into agent_tasks (
      source_signal,agent_key,objective,context,agent_run_id,artifact,judge_summary,status,
      action_kind,action_payload,execution_state,idempotency_key,policy_version,action_policy_version
    )
    values (
      ${input.sourceSignal},${input.agentKey},${input.objective},
      ${sql.json((input.context||{}) as never)},
      ${input.agentRunId ?? null}::uuid,
      ${input.artifact ?? null},
      ${sql.json((input.judgeSummary||{}) as never)},
      'PROPOSED',
      ${input.actionKind ?? null},
      ${sql.json((input.actionPayload||{}) as never)},
      ${input.actionKind ? "PENDING" : "NOT_REQUESTED"},
      ${input.idempotencyKey ?? null},
      ${input.policyVersion ?? null},
      ${input.actionPolicyVersion ?? null}
    )
    on conflict (idempotency_key) where idempotency_key is not null do nothing
    returning id::text
  `;
  return rows[0]?.id??null;
}

export async function recordAgentTaskExecution(input:{id:string;ok:boolean;result:unknown;evidenceHash?:string|null}){
  const sql=getDatabase();if(!sql)return false;
  const rows=await sql<{id:string}[]>`
    update agent_tasks set
      status=${input.ok?"AUTO_EXECUTED":"EXECUTION_FAILED"},
      execution_state=${input.ok?"COMPLETE":"FAILED"},
      execution_result=${sql.json((input.result||{}) as never)},
      execution_evidence_hash=${input.evidenceHash ?? null},
      executed_at=now(),
      reviewer=coalesce(reviewer,'policy-engine'),
      reviewed_at=coalesce(reviewed_at,now())
    where id=${input.id}::uuid and status='PROPOSED'
    returning id::text
  `;
  return Boolean(rows[0]);
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
    status:string;actionKind:string|null;executionState:string;createdAt:string;reviewedAt:string|null;
    idempotencyKey:string|null;executionEvidenceHash:string|null;
  }>>`
    select id::text,source_signal as "sourceSignal",agent_key as "agentKey",objective,artifact,status,
      action_kind as "actionKind",execution_state as "executionState",
      idempotency_key as "idempotencyKey",execution_evidence_hash as "executionEvidenceHash",
      created_at::text as "createdAt",reviewed_at::text as "reviewedAt"
    from agent_tasks
    order by case status when 'PROPOSED' then 0 else 1 end,created_at desc
    limit ${bounded}
  `;
}
