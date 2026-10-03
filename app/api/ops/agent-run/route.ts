import { z } from "zod";
import { AGENTS, agentSystemPrompt } from "@/src/agents/registry";
import { deterministicBrandJudge, deterministicTruthJudge } from "@/src/judges/rules";
import { finishPersistedAgentRun, getAgentUsageToday, persistExternalJudge, persistJudgeReview, startPersistedAgentRun } from "@/src/db/agents";
import { databaseConfigured } from "@/src/db/client";
import { auditOpsEvent } from "@/src/db/governance";

import { opsAuthorized } from "@/src/security/ops-auth";
export const runtime = "nodejs";

const Input = z.object({
  agent: z.enum(["orchestrator","supply-scout","route-architect","seo-strategist","content-factory","growth-operator","sem-operator","hotel-sales","revenue-reconciler","support","engineering"]),
  objective: z.string().min(3).max(3000),
  context: z.record(z.string(), z.unknown()).optional(),
});

async function openRouter(messages: {role:"system"|"user";content:string}[]) {
  const key = process.env.OPENROUTER_API_KEY;
  if (!key) throw new Error("OPENROUTER_API_KEY is not configured");
  const model = process.env.OPENROUTER_MODEL || "openrouter/free";
  const res = await fetch("https://openrouter.ai/api/v1/chat/completions", {
    method:"POST",
    headers:{
      Authorization:"Bearer " + key,
      "Content-Type":"application/json",
      "HTTP-Referer":process.env.NEXT_PUBLIC_SITE_URL || "https://vercel.app",
      "X-Title":"Atlas Lab"
    },
    body:JSON.stringify({ model, messages, temperature:0.25, max_tokens:900 })
  });
  if (!res.ok) throw new Error("OpenRouter status " + res.status);
  const data = await res.json();
  return { text:String(data?.choices?.[0]?.message?.content || ""), usage:data?.usage, model };
}


export async function POST(req: Request) {
  if(!(await opsAuthorized(req))) return new Response("Unauthorized",{status:401});
  const parsed = Input.safeParse(await req.json().catch(()=>null));
  if (!parsed.success) return Response.json({error:"Invalid request"},{status:400});
  const policy = AGENTS[parsed.data.agent];
  if(process.env.AGENT_RUNTIME_ENABLED==="false"){
    return Response.json({error:"agent-runtime-disabled"},{status:503});
  }
  if(!databaseConfigured()){
    return Response.json({error:"agent-governance-database-required"},{status:503});
  }
  const usage=await getAgentUsageToday(policy.key);
  if(!usage){
    return Response.json({error:"agent-governance-unavailable"},{status:503});
  }
  if(usage.runs>=policy.maxRunsPerDay){
    return Response.json({error:"agent-daily-run-cap-reached",agent:policy.key,limit:policy.maxRunsPerDay,used:usage.runs},{status:429});
  }
  const runId = crypto.randomUUID();
  await Promise.allSettled([startPersistedAgentRun({id:runId,agentKey:policy.key,objective:parsed.data.objective,payload:parsed.data.context || {}})]);

  try {
    const actor = await openRouter([
      {role:"system",content:agentSystemPrompt(policy)},
      {role:"user",content:JSON.stringify({objective:parsed.data.objective,context:parsed.data.context || {}})}
    ]);

    const deterministic = [
      deterministicTruthJudge(actor.text),
      deterministicBrandJudge(actor.text),
    ];

    const judge = await openRouter([
      {role:"system",content:[
        "You are an independent external judge. You did not create the artifact.",
        "Evaluate only the artifact and supplied policy. Do not repair it.",
        "Return one line beginning PASS, REVISION or REJECT, then concise reasons.",
        "Reject invented commercial facts, unverified prices, fabricated execution claims, or actions exceeding authority."
      ].join(" ")},
      {role:"user",content:JSON.stringify({artifact:actor.text,policy,deterministicChecks:deterministic})}
    ]);

    const approved=deterministic.every(x=>x.verdict==="PASS")&&judge.text.trim().toUpperCase().startsWith("PASS");

    await Promise.allSettled([
      ...deterministic.map(result=>persistJudgeReview({runId,result})),
      persistExternalJudge({runId,text:judge.text}),
      finishPersistedAgentRun({
        id:runId,
        status:"COMPLETE",
        output:{
          artifact:actor.text,
          externalJudge:judge.text,
          deterministic,
          approved,
        },
        usage:{actor:actor.usage,judge:judge.usage},
      }),
    ]);

    await auditOpsEvent({actor:"ops",action:"agent.run",resourceType:"agent-run",resourceId:runId,outcome:approved?"APPROVED_ARTIFACT":"REVIEW_REQUIRED",detail:{agent:policy.key,model:actor.model}});
    console.log(JSON.stringify({
      level:"info",event:"agent_run",runId,agent:policy.key,model:actor.model,
      actorUsage:actor.usage,judgeUsage:judge.usage,deterministic
    }));

    return Response.json({
      runId,
      agent:policy.key,
      authority:{maxRunsPerDay:policy.maxRunsPerDay,maxExternalSpendEur:policy.maxExternalSpendEur,canPublish:policy.canPublish,canCommitMoney:policy.canCommitMoney},
      artifact:actor.text,
      deterministicJudges:deterministic,
      externalJudge:judge.text,
      approved,
      promotionAllowed:false,
      usageBeforeRun:usage,
      model:actor.model,
    });
  } catch (error) {
    await Promise.allSettled([finishPersistedAgentRun({id:runId,status:"FAILED",output:{error:String(error)}})]);
    console.error(JSON.stringify({level:"error",event:"agent_run_failed",runId,agent:policy.key,error:String(error)}));
    return Response.json({runId,error:"Agent runtime unavailable",detail:String(error)},{status:503});
  }
}
