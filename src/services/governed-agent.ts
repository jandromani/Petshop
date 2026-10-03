import { AGENTS,agentSystemPrompt,type AgentKey } from "@/src/agents/registry";
import { deterministicBrandJudge,deterministicTruthJudge } from "@/src/judges/rules";
import { databaseConfigured } from "@/src/db/client";
import { auditOpsEvent } from "@/src/db/governance";
import { finishPersistedAgentRun,persistExternalJudge,persistJudgeReview,reserveAgentRunSlot,startPersistedAgentRun,usageCostCents } from "@/src/db/agents";

async function openRouter(messages:{role:"system"|"user";content:string}[],model:string){
  const key=process.env.OPENROUTER_API_KEY;
  if(!key)throw new Error("OPENROUTER_API_KEY is not configured");
  const res=await fetch("https://openrouter.ai/api/v1/chat/completions",{
    method:"POST",
    headers:{
      Authorization:"Bearer "+key,
      "Content-Type":"application/json",
      "HTTP-Referer":process.env.NEXT_PUBLIC_SITE_URL||"https://vercel.app",
      "X-Title":"Atlas Lab",
    },
    body:JSON.stringify({model,messages,temperature:.2,max_tokens:900}),
  });
  if(!res.ok)throw new Error("OpenRouter status "+res.status);
  const data=await res.json();
  return{text:String(data?.choices?.[0]?.message?.content||""),usage:data?.usage,model};
}

export async function runGovernedAgent(input:{agent:AgentKey;objective:string;context?:Record<string,unknown>}){
  const policy=AGENTS[input.agent];
  if(process.env.AGENT_RUNTIME_ENABLED==="false")return{ok:false,status:503,error:"agent-runtime-disabled"} as const;
  if(!process.env.OPENROUTER_API_KEY)return{ok:false,status:503,error:"agent-runtime-not-configured"} as const;
  if(!databaseConfigured())return{ok:false,status:503,error:"agent-governance-database-required"} as const;

  const quota=await reserveAgentRunSlot(policy.key,policy.maxRunsPerDay);
  if(!quota)return{ok:false,status:503,error:"agent-governance-unavailable"} as const;
  if(!quota.allowed)return{ok:false,status:429,error:"agent-daily-run-cap-reached",quota} as const;

  const runId=crypto.randomUUID();
  await startPersistedAgentRun({id:runId,agentKey:policy.key,objective:input.objective,payload:input.context||{}});
  try{
    const actorModel=process.env.OPENROUTER_MODEL||"openrouter/free";
    const judgeModel=process.env.OPENROUTER_JUDGE_MODEL||actorModel;
    const actor=await openRouter([
      {role:"system",content:agentSystemPrompt(policy)},
      {role:"user",content:JSON.stringify({objective:input.objective,context:input.context||{}})},
    ],actorModel);

    const deterministic=[deterministicTruthJudge(actor.text),deterministicBrandJudge(actor.text)];
    const judge=await openRouter([
      {role:"system",content:[
        "You are an independent external judge. You did not create the artifact.",
        "Evaluate only the artifact and policy; do not repair it.",
        "Return one line beginning PASS, REVISION or REJECT, then concise reasons.",
        "Reject invented commercial facts, unverified prices, fabricated execution claims, or actions exceeding authority.",
      ].join(" ")},
      {role:"user",content:JSON.stringify({artifact:actor.text,policy,deterministicChecks:deterministic})},
    ],judgeModel);

    const approved=deterministic.every(x=>x.verdict==="PASS")&&judge.text.trim().toUpperCase().startsWith("PASS");
    const costCents=usageCostCents(actor.usage)+usageCostCents(judge.usage);
    await Promise.allSettled([
      ...deterministic.map(result=>persistJudgeReview({runId,result})),
      persistExternalJudge({runId,text:judge.text}),
      finishPersistedAgentRun({id:runId,status:"COMPLETE",output:{artifact:actor.text,externalJudge:judge.text,deterministic,approved},usage:{actor:actor.usage,judge:judge.usage},costCents}),
      auditOpsEvent({actor:"agent:"+policy.key,action:"agent.run",resourceType:"agent-run",resourceId:runId,outcome:approved?"APPROVED_ARTIFACT":"REVIEW_REQUIRED",detail:{actorModel,judgeModel,costCents}}),
    ]);
    return{ok:true,status:200,runId,agent:policy.key,artifact:actor.text,externalJudge:judge.text,deterministic,approved,promotionAllowed:false,quota,costCents,actorModel,judgeModel} as const;
  }catch(error){
    await finishPersistedAgentRun({id:runId,status:"FAILED",output:{error:String(error)}});
    return{ok:false,status:503,error:"agent-runtime-unavailable",detail:String(error),runId} as const;
  }
}
