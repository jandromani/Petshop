import { getDatabase } from "@/src/db/client";
import type { JudgeResult } from "@/src/judges/rules";

export async function startPersistedAgentRun(input:{id:string;agentKey:string;objective:string;model?:string;payload?:unknown}){
  const sql=getDatabase();
  if(!sql) return false;
  await sql`insert into agent_runs (id,agent_key,objective,model,input,status,started_at) values (${input.id}::uuid,${input.agentKey},${input.objective},${input.model ?? null},${sql.json((input.payload||{}) as never)},'RUNNING',now()) on conflict (id) do nothing`;
  return true;
}

export async function finishPersistedAgentRun(input:{id:string;status:"COMPLETE"|"FAILED";output?:unknown;usage?:unknown;costCents?:number}){
  const sql=getDatabase();
  if(!sql) return false;
  await sql`update agent_runs set output=${sql.json((input.output||{}) as never)},token_usage=${sql.json((input.usage||{}) as never)},estimated_cost_cents=${input.costCents ?? null},status=${input.status},completed_at=now() where id=${input.id}::uuid`;
  return true;
}

export async function persistJudgeReview(input:{runId:string;result:JudgeResult}){
  const sql=getDatabase();
  if(!sql) return false;
  await sql`insert into judge_reviews (agent_run_id,judge_key,verdict,score,reasons) values (${input.runId}::uuid,${input.result.judge},${input.result.verdict},${input.result.score},${sql.json(input.result.reasons)})`;
  return true;
}

export async function persistExternalJudge(input:{runId:string;text:string}){
  const sql=getDatabase();
  if(!sql) return false;
  const upper=input.text.trim().toUpperCase();
  const verdict=upper.startsWith("PASS")?"PASS":upper.startsWith("REJECT")?"REJECT":"REVISION";
  await sql`insert into judge_reviews (agent_run_id,judge_key,verdict,score,reasons) values (${input.runId}::uuid,'external-llm',${verdict},null,${sql.json([input.text.slice(0,2000)])})`;
  return true;
}

export async function getAgentUsageToday(agentKey:string){
  const sql=getDatabase();
  if(!sql) return null;
  const rows=await sql<{runs:number;cost_cents:number}[]>`
    select count(*)::int as runs,coalesce(sum(estimated_cost_cents),0)::int as cost_cents
    from agent_runs
    where agent_key=${agentKey}
      and started_at>=date_trunc('day',now())
  `;
  const row=rows[0];
  return{runs:Number(row?.runs||0),costCents:Number(row?.cost_cents||0)};
}

export async function getGlobalAgentSpendToday(){
  const sql=getDatabase();if(!sql)return null;
  const rows=await sql<{runs:number;cost_cents:number}[]>`
    select count(*)::int as runs,coalesce(sum(estimated_cost_cents),0)::int as cost_cents
    from agent_runs where started_at>=date_trunc('day',now())
  `;
  return{runs:Number(rows[0]?.runs||0),costCents:Number(rows[0]?.cost_cents||0)};
}

export async function reserveAgentRunSlot(agentKey:string,maxRunsPerDay:number){
  const sql=getDatabase();
  if(!sql)return null;
  const maxRuns=Math.max(1,Math.floor(maxRunsPerDay));
  const rows=await sql<{run_count:number}[]>`
    insert into agent_daily_budget (agent_key,budget_date,run_count,updated_at)
    values (${agentKey},current_date,1,now())
    on conflict (agent_key,budget_date) do update set
      run_count=agent_daily_budget.run_count+1,
      updated_at=now()
    where agent_daily_budget.run_count<${maxRuns}
    returning run_count
  `;
  return rows[0]?{allowed:true,used:Number(rows[0].run_count),limit:maxRuns}:{allowed:false,used:maxRuns,limit:maxRuns};
}

export function usageCostCents(usage:unknown){
  if(!usage||typeof usage!=="object")return 0;
  const raw=(usage as Record<string,unknown>).cost;
  const cost=typeof raw==="number"?raw:typeof raw==="string"?Number(raw):0;
  return Number.isFinite(cost)&&cost>0?Math.round(cost*100):0;
}
