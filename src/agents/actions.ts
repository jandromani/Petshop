import type { AgentKey } from "@/src/agents/registry";
import { getOpsSnapshot } from "@/src/db/ops";
import { growthFunnel,heroExperimentReadout } from "@/src/db/growth";
import { indexableDiscoveryPages } from "@/src/seo/live";
import { reconcileRevenue } from "@/src/services/revenue-reconciliation";

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

export async function executeSafeAgentAction(agent:AgentKey,proposal:AgentProposal){
  const action=proposal.proposedAction;
  if(!action)return{executed:false,reason:"no-action"};
  if(!isActionAllowed(agent,action.kind))return{executed:false,reason:"action-not-allowed"};
  if(!isAutoExecutable(action.kind))return{executed:false,reason:"human-authority-required"};

  switch(action.kind){
    case"ops.snapshot":
      return{executed:true,kind:action.kind,result:await getOpsSnapshot()};
    case"growth.audit":
      return{executed:true,kind:action.kind,result:{funnel:await growthFunnel(30),hero:await heroExperimentReadout(30)}};
    case"seo.audit":{
      const pages=await indexableDiscoveryPages();
      return{executed:true,kind:action.kind,result:{indexable:pages.map(x=>x.page.slug),count:pages.length}};
    }
    case"revenue.reconcile":
      return{executed:true,kind:action.kind,result:await reconcileRevenue(30)};
    default:
      return{executed:false,reason:"human-authority-required"};
  }
}
