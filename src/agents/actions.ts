import type { AgentKey } from "@/src/agents/registry";
import { getOpsSnapshot } from "@/src/db/ops";
import { growthFunnel,heroExperimentReadout } from "@/src/db/growth";
import { getRuntimeConfig } from "@/src/db/runtime-config";
import { indexableDiscoveryPages } from "@/src/seo/live";
import { reconcileRevenue } from "@/src/services/revenue-reconciliation";
import { stableEvidenceHash } from "@/src/services/evidence";

export const AGENT_POLICY_VERSION="omega-policy-v1";
export const AGENT_PROMPT_VERSION="omega-prompt-v1";
export const AGENT_ACTION_POLICY_VERSION="omega-actions-v1";

export type AgentActionKind=
  |"ops.snapshot"
  |"growth.audit"
  |"seo.audit"
  |"revenue.reconcile"
  |"supply.refresh"
  |"direct.publish"
  |"sem.spend"
  |"hotel.outreach"
  |"code.change";

export type AgentProposal={
  summary:string;
  proposedAction:null|{kind:AgentActionKind;payload:Record<string,unknown>};
};

const ALLOWED:Record<AgentKey,AgentActionKind[]>={
  orchestrator:["ops.snapshot"],
  "supply-scout":["supply.refresh"],
  "route-architect":[],
  "seo-strategist":["seo.audit"],
  "content-factory":["seo.audit"],
  "growth-operator":["growth.audit"],
  "sem-operator":["sem.spend"],
  "hotel-sales":["hotel.outreach","direct.publish"],
  "revenue-reconciler":["revenue.reconcile"],
  support:[],
  engineering:["ops.snapshot","code.change"],
};

const AUTO=new Set<AgentActionKind>(["ops.snapshot","growth.audit","seo.audit","revenue.reconcile"]);

export function allowedActionsForAgent(agent:AgentKey){return ALLOWED[agent]||[];}
export function isAutoExecutable(kind:AgentActionKind){return AUTO.has(kind);}
export function isActionAllowed(agent:AgentKey,kind:AgentActionKind){return allowedActionsForAgent(agent).includes(kind);}

export function agentEmergencyStopActive(){
  return process.env.AGENT_EMERGENCY_STOP==="true";
}

function actionEnvKey(kind:AgentActionKind){
  return "AGENT_ACTION_"+kind.toUpperCase().replace(/[.-]/g,"_")+"_ENABLED";
}

export async function autoActionDecision(kind:AgentActionKind){
  if(!isAutoExecutable(kind))return{allowed:false,reason:"human-authority-required"} as const;
  if(agentEmergencyStopActive())return{allowed:false,reason:"global-emergency-stop"} as const;
  if(process.env[actionEnvKey(kind)]==="false")return{allowed:false,reason:"action-env-disabled"} as const;
  const runtime=await getRuntimeConfig<{enabled?:boolean}>("agent.action."+kind);
  if(runtime?.enabled===false)return{allowed:false,reason:"runtime-action-disabled"} as const;
  return{allowed:true,reason:"allowlisted"} as const;
}

export function agentActionIdempotencyKey(agent:AgentKey,proposal:AgentProposal,scope:string){
  return stableEvidenceHash({
    version:AGENT_ACTION_POLICY_VERSION,
    agent,
    scope,
    action:proposal.proposedAction,
  });
}

function stripFence(raw:string){
  const text=raw.trim();
  if(text.startsWith("```")){
    return text.replace(/^```(?:json)?\s*/i,"").replace(/\s*```$/,"").trim();
  }
  return text;
}

export function parseAgentProposal(raw:string):AgentProposal|null{
  try{
    const value=JSON.parse(stripFence(raw));
    if(!value||typeof value!=="object"||Array.isArray(value))return null;
    const summary=String((value as any).summary||"").trim();
    const action=(value as any).proposedAction;
    if(!summary)return null;
    if(action===null||action===undefined)return{summary,proposedAction:null};
    if(typeof action!=="object"||Array.isArray(action))return null;
    const kind=String(action.kind||"") as AgentActionKind;
    const known=[
      "ops.snapshot","growth.audit","seo.audit","revenue.reconcile","supply.refresh",
      "direct.publish","sem.spend","hotel.outreach","code.change",
    ].includes(kind);
    if(!known)return null;
    const payload=action.payload&&typeof action.payload==="object"&&!Array.isArray(action.payload)?action.payload:{};
    return{summary,proposedAction:{kind,payload}};
  }catch{return null;}
}

export async function executeSafeAgentAction(agent:AgentKey,proposal:AgentProposal,options:{scope?:string}={}){
  const action=proposal.proposedAction;
  if(!action)return{executed:false,reason:"no-action"};
  if(!isActionAllowed(agent,action.kind))return{executed:false,reason:"action-not-allowed"};
  const decision=await autoActionDecision(action.kind);
  if(!decision.allowed)return{executed:false,reason:decision.reason,kind:action.kind};

  const scope=options.scope||"unspecified";
  const idempotencyKey=agentActionIdempotencyKey(agent,proposal,scope);
  let result:unknown;

  switch(action.kind){
    case"ops.snapshot":
      result=await getOpsSnapshot();
      break;
    case"growth.audit":
      result={funnel:await growthFunnel(30),hero:await heroExperimentReadout(30)};
      break;
    case"seo.audit":{
      const pages=await indexableDiscoveryPages();
      result={indexable:pages.map(x=>x.page.slug),count:pages.length};
      break;
    }
    case"revenue.reconcile":
      result=await reconcileRevenue(30);
      break;
    default:
      return{executed:false,reason:"human-authority-required",kind:action.kind};
  }

  return{
    executed:true,
    kind:action.kind,
    idempotencyKey,
    evidenceHash:stableEvidenceHash(result),
    policyVersion:AGENT_POLICY_VERSION,
    actionPolicyVersion:AGENT_ACTION_POLICY_VERSION,
    result,
  };
}
