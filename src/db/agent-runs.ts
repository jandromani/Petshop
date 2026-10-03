import { getDatabase } from "@/src/db/client";

export async function beginAgentRun(input:{
  id:string;
  agentKey:string;
  objective:string;
  model?:string;
  context?:unknown;
}){
  const sql=getDatabase();
  if(!sql) return false;
  try{
    await sql`
      insert into agent_runs (id,agent_key,objective,model,input,status,started_at)
      values (
        ${input.id}::uuid,
        ${input.agentKey},
        ${input.objective},
        ${input.model ?? null},
        ${sql.json((input.context || {}) as never)},
        'RUNNING',
        now()
      )
      on conflict (id) do nothing
    `;
    return true;
  }catch(error){
    console.error(JSON.stringify({level:"error",event:"db_agent_begin_failed",runId:input.id,error:String(error)}));
    return false;
  }
}

export async function finishAgentRun(input:{
  id:string;
  status:"COMPLETE"|"FAILED";
  model?:string;
  output?:unknown;
  usage?:unknown;
  estimatedCostCents?:number;
}){
  const sql=getDatabase();
  if(!sql) return false;
  try{
    await sql`
      update agent_runs set
        status=${input.status},
        model=coalesce(${input.model ?? null},model),
        output=${sql.json((input.output || {}) as never)},
        token_usage=${sql.json((input.usage || {}) as never)},
        estimated_cost_cents=${input.estimatedCostCents ?? null},
        completed_at=now()
      where id=${input.id}::uuid
    `;
    return true;
  }catch(error){
    console.error(JSON.stringify({level:"error",event:"db_agent_finish_failed",runId:input.id,error:String(error)}));
    return false;
  }
}

export async function persistJudgeReview(input:{
  runId:string;
  judgeKey:string;
  verdict:"PASS"|"REVISION"|"REJECT";
  score?:number;
  reasons?:unknown;
}){
  const sql=getDatabase();
  if(!sql) return false;
  try{
    await sql`
      insert into judge_reviews (agent_run_id,judge_key,verdict,score,reasons)
      values (
        ${input.runId}::uuid,
        ${input.judgeKey},
        ${input.verdict},
        ${input.score ?? null},
        ${sql.json((input.reasons || []) as never)}
      )
    `;
    return true;
  }catch(error){
    console.error(JSON.stringify({level:"error",event:"db_judge_review_failed",runId:input.runId,judge:input.judgeKey,error:String(error)}));
    return false;
  }
}

export function parseJudgeVerdict(text:string):"PASS"|"REVISION"|"REJECT"{
  const first=text.trim().toUpperCase();
  if(first.startsWith("PASS")) return "PASS";
  if(first.startsWith("REJECT")) return "REJECT";
  return "REVISION";
}

export function usageCostCents(usage:unknown){
  if(!usage || typeof usage!=="object") return undefined;
  const cost=(usage as Record<string,unknown>).cost;
  const value=typeof cost==="number" ? cost : typeof cost==="string" ? Number(cost) : NaN;
  return Number.isFinite(value) && value>=0 ? Math.round(value*10000)/100 : undefined;
}
