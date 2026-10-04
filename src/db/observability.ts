import { getDatabase } from "@/src/db/client";

export type ProviderErrorBudget={
  provider:string;
  runs:number;
  cleanRuns:number;
  successPct:number|null;
  targetSuccessPct:number;
  allowedFailurePct:number;
  observedFailurePct:number|null;
  remainingFailureBudgetPct:number|null;
  budgetConsumedPct:number|null;
};

export function computeErrorBudget(provider:string,runs:number,cleanRuns:number,targetSuccessPct=95):ProviderErrorBudget{
  const total=Math.max(0,Math.floor(runs));
  const clean=Math.max(0,Math.min(total,Math.floor(cleanRuns)));
  const allowedFailurePct=Math.max(0,100-targetSuccessPct);
  if(total===0){
    return{
      provider,runs:0,cleanRuns:0,successPct:null,targetSuccessPct,allowedFailurePct,
      observedFailurePct:null,remainingFailureBudgetPct:null,budgetConsumedPct:null,
    };
  }
  const successPct=clean/total*100;
  const observedFailurePct=100-successPct;
  const remainingFailureBudgetPct=Math.max(0,allowedFailurePct-observedFailurePct);
  const budgetConsumedPct=allowedFailurePct>0
    ?Math.min(100,Math.max(0,observedFailurePct/allowedFailurePct*100))
    :(observedFailurePct>0?100:0);
  return{
    provider,runs:total,cleanRuns:clean,successPct,targetSuccessPct,allowedFailurePct,
    observedFailurePct,remainingFailureBudgetPct,budgetConsumedPct,
  };
}

export async function providerErrorBudgets(days=30,targetSuccessPct=95){
  const sql=getDatabase();if(!sql)return[] as ProviderErrorBudget[];
  const bounded=Math.max(1,Math.min(365,days));
  try{
    const rows=await sql<Array<{provider:string;runs:number;clean_runs:number}>>`
    select coalesce(provider,'multi') as provider,
      count(*)::int as runs,
      count(*) filter (where status='COMPLETE' and error_count=0)::int as clean_runs
    from acquisition_runs
    where started_at>=now()-make_interval(days => ${bounded})
    group by coalesce(provider,'multi')
    order by runs desc,provider
  `;
    return rows.map(row=>computeErrorBudget(
      row.provider,
      Number(row.runs||0),
      Number(row.clean_runs||0),
      targetSuccessPct,
    ));
  }catch(error){
    console.error(JSON.stringify({level:"error",event:"provider_error_budget_query_failed",error:String(error).slice(0,300)}));
    return[];
  }
}

export type AgentRoleMetric={
  agentKey:string;
  actorProvider:string;
  actorModel:string;
  judgeProvider:string;
  judgeModel:string;
  runs:number;
  completed:number;
  failed:number;
  costCents:number;
  promptTokens:number;
  completionTokens:number;
  totalTokens:number;
};

export async function agentRoleMetrics(days=30):Promise<AgentRoleMetric[]>{
  const sql=getDatabase();if(!sql)return[];
  const bounded=Math.max(1,Math.min(365,days));
  try{
    const rows=await sql<Array<{
    agent_key:string;actor_provider:string;actor_model:string;judge_provider:string;judge_model:string;
    runs:number;completed:number;failed:number;cost_cents:number;
    prompt_tokens:number;completion_tokens:number;total_tokens:number;
  }>>`
    select
      ar.agent_key,
      coalesce(a.detail->>'actorProvider','unknown') as actor_provider,
      coalesce(a.detail->>'actorModel',ar.model,'unknown') as actor_model,
      coalesce(a.detail->>'judgeProvider','unknown') as judge_provider,
      coalesce(a.detail->>'judgeModel','unknown') as judge_model,
      count(*)::int as runs,
      count(*) filter (where ar.status='COMPLETE')::int as completed,
      count(*) filter (where ar.status='FAILED')::int as failed,
      coalesce(sum(ar.estimated_cost_cents),0)::int as cost_cents,
      coalesce(sum(
        case when coalesce(ar.token_usage->'actor'->>'prompt_tokens',ar.token_usage->'actor'->>'input_tokens','') ~ '^[0-9]+$'
          then coalesce(ar.token_usage->'actor'->>'prompt_tokens',ar.token_usage->'actor'->>'input_tokens')::bigint else 0 end
        +
        case when coalesce(ar.token_usage->'judge'->>'prompt_tokens',ar.token_usage->'judge'->>'input_tokens','') ~ '^[0-9]+$'
          then coalesce(ar.token_usage->'judge'->>'prompt_tokens',ar.token_usage->'judge'->>'input_tokens')::bigint else 0 end
      ),0)::bigint as prompt_tokens,
      coalesce(sum(
        case when coalesce(ar.token_usage->'actor'->>'completion_tokens',ar.token_usage->'actor'->>'output_tokens','') ~ '^[0-9]+$'
          then coalesce(ar.token_usage->'actor'->>'completion_tokens',ar.token_usage->'actor'->>'output_tokens')::bigint else 0 end
        +
        case when coalesce(ar.token_usage->'judge'->>'completion_tokens',ar.token_usage->'judge'->>'output_tokens','') ~ '^[0-9]+$'
          then coalesce(ar.token_usage->'judge'->>'completion_tokens',ar.token_usage->'judge'->>'output_tokens')::bigint else 0 end
      ),0)::bigint as completion_tokens,
      coalesce(sum(
        case when coalesce(ar.token_usage->'actor'->>'total_tokens','') ~ '^[0-9]+$'
          then (ar.token_usage->'actor'->>'total_tokens')::bigint else 0 end
        +
        case when coalesce(ar.token_usage->'judge'->>'total_tokens','') ~ '^[0-9]+$'
          then (ar.token_usage->'judge'->>'total_tokens')::bigint else 0 end
      ),0)::bigint as total_tokens
    from agent_runs ar
    left join lateral (
      select detail
      from ops_audit_events
      where action='agent.run'
        and resource_type='agent-run'
        and resource_id=ar.id::text
      order by created_at desc
      limit 1
    ) a on true
    where ar.started_at>=now()-make_interval(days => ${bounded})
    group by ar.agent_key,
      coalesce(a.detail->>'actorProvider','unknown'),
      coalesce(a.detail->>'actorModel',ar.model,'unknown'),
      coalesce(a.detail->>'judgeProvider','unknown'),
      coalesce(a.detail->>'judgeModel','unknown')
    order by runs desc,ar.agent_key
  `;

    return rows.map(row=>{
    const promptTokens=Number(row.prompt_tokens||0);
    const completionTokens=Number(row.completion_tokens||0);
    const reportedTotal=Number(row.total_tokens||0);
    return{
      agentKey:row.agent_key,
      actorProvider:row.actor_provider,
      actorModel:row.actor_model,
      judgeProvider:row.judge_provider,
      judgeModel:row.judge_model,
      runs:Number(row.runs||0),
      completed:Number(row.completed||0),
      failed:Number(row.failed||0),
      costCents:Number(row.cost_cents||0),
      promptTokens,
      completionTokens,
      totalTokens:reportedTotal||promptTokens+completionTokens,
    };
    });
  }catch(error){
    console.error(JSON.stringify({level:"error",event:"agent_role_metrics_query_failed",error:String(error).slice(0,300)}));
    return[];
  }
}
