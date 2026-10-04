import { AGENTS,agentSystemPrompt,type AgentKey } from "@/src/agents/registry";
import { runRequiredJudges } from "@/src/judges/rules";
import { databaseConfigured } from "@/src/db/client";
import { auditOpsEvent } from "@/src/db/governance";
import { finishPersistedAgentRun,getGlobalAgentSpendToday,persistExternalJudge,persistJudgeReview,reserveAgentRunSlot,startPersistedAgentRun,usageCostCents } from "@/src/db/agents";
import { agentModelConfigured,llmCompletion } from "@/src/agents/llm";
import {
  AGENT_ACTION_POLICY_VERSION,AGENT_POLICY_VERSION,AGENT_PROMPT_VERSION,
  allowedActionsForAgent,autoActionDecision,isActionAllowed,parseAgentProposal,
} from "@/src/agents/actions";

export async function runGovernedAgent(input:{agent:AgentKey;objective:string;context?:Record<string,unknown>}){
  const policy=AGENTS[input.agent];
  if(process.env.AGENT_RUNTIME_ENABLED==="false")return{ok:false,status:503,error:"agent-runtime-disabled"} as const;
  if(process.env.AGENT_EMERGENCY_STOP==="true")return{ok:false,status:503,error:"agent-emergency-stop"} as const;
  if(!agentModelConfigured())return{ok:false,status:503,error:"agent-runtime-not-configured"} as const;
  if(!databaseConfigured())return{ok:false,status:503,error:"agent-governance-database-required"} as const;

  const dailyBudget=Math.max(0,Number(process.env.AGENT_DAILY_BUDGET_CENTS||100));
  const spend=await getGlobalAgentSpendToday();
  if(spend&&dailyBudget>0&&spend.costCents>=dailyBudget){
    return{ok:false,status:429,error:"agent-daily-cost-cap-reached",budget:{usedCents:spend.costCents,limitCents:dailyBudget}} as const;
  }

  const quota=await reserveAgentRunSlot(policy.key,policy.maxRunsPerDay);
  if(!quota)return{ok:false,status:503,error:"agent-governance-unavailable"} as const;
  if(!quota.allowed)return{ok:false,status:429,error:"agent-daily-run-cap-reached",quota} as const;

  const runId=crypto.randomUUID();
  const allowedActions=allowedActionsForAgent(input.agent);
  await startPersistedAgentRun({
    id:runId,agentKey:policy.key,objective:input.objective,
    payload:{...(input.context||{}),allowedActions},
    policyVersion:AGENT_POLICY_VERSION,promptVersion:AGENT_PROMPT_VERSION,actionPolicyVersion:AGENT_ACTION_POLICY_VERSION,
  });
  try{
    const actor=await llmCompletion([
      {role:"system",content:agentSystemPrompt(policy)},
      {role:"user",content:JSON.stringify({objective:input.objective,context:input.context||{},allowedActions,policyVersion:AGENT_POLICY_VERSION})},
    ],{role:"actor",maxTokens:700,temperature:.2});

    const proposal=parseAgentProposal(actor.text);
    const actionAllowed=Boolean(proposal)&&(!proposal?.proposedAction||isActionAllowed(policy.key,proposal.proposedAction.kind));
    const deterministic=runRequiredJudges(policy.requiredJudges,actor.text);
    const judge=await llmCompletion([
      {role:"system",content:[
        "You are an independent downstream judge. You did not create the artifact.",
        "Evaluate only the artifact and policy; do not repair it.",
        "Return one line beginning PASS, REVISION or REJECT, then concise reasons.",
        "Reject invalid JSON, invented commercial facts, unverified prices, fabricated execution claims, or actions exceeding authority.",
      ].join(" ")},
      {role:"user",content:JSON.stringify({artifact:actor.text,proposal,policy,allowedActions,deterministicChecks:deterministic,policyVersion:AGENT_POLICY_VERSION})},
    ],{role:"judge",maxTokens:400,temperature:0});

    const independentJudge=actor.provider!==judge.provider||actor.model!==judge.model;
    const requireIndependent=process.env.AGENT_REQUIRE_INDEPENDENT_JUDGE!=="false";
    const judgePass=judge.text.trim().toUpperCase().startsWith("PASS");
    const approved=Boolean(proposal)&&actionAllowed&&deterministic.every(x=>x.verdict==="PASS")&&judgePass&&(!requireIndependent||independentJudge);
    const promotionDecision=proposal?.proposedAction
      ?await autoActionDecision(proposal.proposedAction.kind)
      :{allowed:false,reason:"no-action"} as const;
    const promotionAllowed=Boolean(approved&&promotionDecision.allowed);
    const costCents=usageCostCents(actor.usage)+usageCostCents(judge.usage);

    await Promise.allSettled([
      ...deterministic.map(result=>persistJudgeReview({runId,result})),
      persistExternalJudge({runId,text:judge.text}),
      finishPersistedAgentRun({
        id:runId,status:"COMPLETE",
        output:{
          artifact:actor.text,proposal,externalJudge:judge.text,deterministic,approved,promotionAllowed,
          promotionDecision,independentJudge,actionAllowed,
          policyVersion:AGENT_POLICY_VERSION,promptVersion:AGENT_PROMPT_VERSION,actionPolicyVersion:AGENT_ACTION_POLICY_VERSION,
        },
        usage:{actor:actor.usage,judge:judge.usage},costCents,
      }),
      auditOpsEvent({
        actor:"agent:"+policy.key,action:"agent.run",resourceType:"agent-run",resourceId:runId,
        outcome:promotionAllowed?"AUTO_ACTION_ELIGIBLE":approved?"APPROVED_ARTIFACT":"REVIEW_REQUIRED",
        detail:{
          actorModel:actor.model,judgeModel:judge.model,actorProvider:actor.provider,judgeProvider:judge.provider,
          costCents,independentJudge,actionAllowed,promotionDecision,
          policyVersion:AGENT_POLICY_VERSION,promptVersion:AGENT_PROMPT_VERSION,actionPolicyVersion:AGENT_ACTION_POLICY_VERSION,
        },
      }),
    ]);

    return{
      ok:true,status:200,runId,agent:policy.key,artifact:actor.text,proposal,
      externalJudge:judge.text,deterministic,approved,promotionAllowed,promotionDecision,quota,costCents,
      actorModel:actor.model,judgeModel:judge.model,actorProvider:actor.provider,judgeProvider:judge.provider,independentJudge,
      policyVersion:AGENT_POLICY_VERSION,promptVersion:AGENT_PROMPT_VERSION,actionPolicyVersion:AGENT_ACTION_POLICY_VERSION,
    } as const;
  }catch(error){
    await finishPersistedAgentRun({id:runId,status:"FAILED",output:{error:String(error),policyVersion:AGENT_POLICY_VERSION}});
    return{ok:false,status:503,error:"agent-runtime-unavailable",detail:String(error),runId} as const;
  }
}
