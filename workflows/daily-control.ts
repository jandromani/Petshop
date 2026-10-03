import { AGENTS } from "@/src/agents/registry";
import { getOpsSnapshot } from "@/src/db/ops";
import { databaseConfigured } from "@/src/db/client";
import { liveProviderStatuses } from "@/src/providers/live/registry";
import { reconcileRevenue } from "@/src/services/revenue-reconciliation";

export type ControlSignal={key:string;severity:"info"|"warning"|"critical";message:string};

export async function collectControlSignals():Promise<ControlSignal[]>{
  "use step";
  const signals:ControlSignal[]=[];
  const db=databaseConfigured();
  const providers=liveProviderStatuses();
  const ops=await getOpsSnapshot();

  if(!db)signals.push({key:"infra.database",severity:"critical",message:"Persistent database is not configured"});
  const disabled=providers.filter(p=>!p.configured).map(p=>p.provider);
  if(disabled.length)signals.push({key:"supply.providers",severity:"warning",message:"Disabled providers: "+disabled.join(", ")});
  if(db&&ops.liveOffers===0)signals.push({key:"supply.live",severity:"warning",message:"No fresh SELLABLE redirect offers in the public catalog"});
  const failedWaves=ops.acquisitionRuns.filter(r=>r.status==="FAILED"||r.errors>0);
  if(failedWaves.length)signals.push({key:"supply.waves",severity:"warning",message:failedWaves.length+" recent acquisition waves have errors"});
  const failedAgents=ops.agentRuns.filter(r=>r.status==="FAILED");
  if(failedAgents.length)signals.push({key:"agents.failures",severity:"warning",message:failedAgents.length+" recent agent runs failed"});
  signals.push({key:"agents.authority",severity:"info",message:Object.keys(AGENTS).length+" bounded agent roles; 0 have contract or price publication authority"});
  return signals;
}

export async function buildHumanAgenda(signals:ControlSignal[]){
  "use step";
  return{
    targetHumanMinutes:60,
    urgent:signals.filter(x=>x.severity==="critical"),
    warnings:signals.filter(x=>x.severity==="warning"),
    decisions:["Review critical truth/infrastructure failures.","Approve contracts or material spend.","Review provider onboarding and revenue anomalies."],
  };
}

export async function reconcileDailyRevenue(){
  "use step";
  return reconcileRevenue(30);
}

export async function dailyControlWorkflow(){
  "use workflow";
  const [signals,revenue]=await Promise.all([collectControlSignals(),reconcileDailyRevenue()]);
  const agenda=await buildHumanAgenda(signals);
  return{runType:"daily-control",signals,revenue,agenda,generatedAt:new Date().toISOString()};
}
