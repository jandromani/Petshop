import { AGENTS } from "@/src/agents/registry";
import { getOpsSnapshot } from "@/src/db/ops";
import { databaseHealth } from "@/src/db/client";
import { liveProviderStatuses } from "@/src/providers/live/registry";
import { reconcileRevenue } from "@/src/services/revenue-reconciliation";
import { syncBookingOrders } from "@/src/services/booking-order-sync";
import { syncIncidents } from "@/src/db/governance";
import { runDataRetention } from "@/src/db/retention";
import { runGovernedAgent } from "@/src/services/governed-agent";
import { agentForSignal,objectiveForSignal } from "@/src/agents/router";
import { createAgentTask,recordAgentTaskExecution } from "@/src/db/agent-tasks";
import { agentModelConfigured } from "@/src/agents/llm";
import { executeSafeAgentAction } from "@/src/agents/actions";
import { optimizeHeroExperiment } from "@/src/growth/autopilot";

export type ControlSignal={key:string;severity:"info"|"warning"|"critical";message:string};

export async function collectControlSignals():Promise<ControlSignal[]>{
  "use step";
  const signals:ControlSignal[]=[];
  const [db,ops]=await Promise.all([databaseHealth(),getOpsSnapshot()]);
  const providers=liveProviderStatuses();

  if(!db.configured)signals.push({key:"infra.database",severity:"critical",message:"Persistent database is not configured"});
  else if(!db.reachable)signals.push({key:"infra.database",severity:"critical",message:"Persistent database is configured but unreachable"});
  const disabled=providers.filter(p=>!p.configured).map(p=>p.provider);
  if(disabled.length)signals.push({key:"supply.providers",severity:"warning",message:"Disabled providers: "+disabled.join(", ")});
  if(db.reachable&&ops.liveOffers===0)signals.push({key:"supply.live",severity:"warning",message:"No fresh SELLABLE redirect offers in the public catalog"});
  const failedWaves=ops.acquisitionRuns.filter(r=>r.status==="FAILED"||r.errors>0);
  if(failedWaves.length)signals.push({key:"supply.waves",severity:"warning",message:failedWaves.length+" recent acquisition waves have errors"});
  const failedAgents=ops.agentRuns.filter(r=>r.status==="FAILED");
  if(failedAgents.length)signals.push({key:"agents.failures",severity:"warning",message:failedAgents.length+" recent agent runs failed"});
  signals.push({key:"agents.authority",severity:"info",message:Object.keys(AGENTS).length+" bounded roles; only allowlisted read-only/idempotent actions can auto-execute"});
  return signals;
}

export async function persistControlIncidents(signals:ControlSignal[]){
  "use step";
  return syncIncidents(signals.filter((x):x is ControlSignal & {severity:"warning"|"critical"}=>x.severity!=="info"));
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

export async function syncProviderRevenue(){
  "use step";
  return syncBookingOrders();
}

export async function applyDataRetention(){
  "use step";
  return runDataRetention();
}

export async function runGrowthAutopilot(){
  "use step";
  return optimizeHeroExperiment(30);
}

export async function runDailyAdvisor(context:Record<string,unknown>){
  "use step";
  return runGovernedAgent({
    agent:"orchestrator",
    objective:"Prioritize the next operational review using only supplied facts. If a safe read-only action would reduce uncertainty, propose exactly one allowlisted action. Never publish, spend, sign, contact third parties or claim execution.",
    context,
  });
}

export async function dispatchSpecialistAgents(signals:ControlSignal[]){
  "use step";
  if(!agentModelConfigured()||process.env.AGENT_RUNTIME_ENABLED==="false")return{configured:false,tasks:[]};
  const actionable=signals.filter(x=>x.severity!=="info").slice(0,5);
  const tasks=[];
  for(const signal of actionable){
    const agent=agentForSignal(signal.key);
    const objective=objectiveForSignal(signal);
    const run=await runGovernedAgent({agent,objective,context:{signal}});
    if(run.ok){
      const action=run.proposal?.proposedAction||null;
      const taskId=await createAgentTask({
        sourceSignal:signal.key,
        agentKey:agent,
        objective,
        context:{signal},
        agentRunId:run.runId,
        artifact:run.artifact,
        judgeSummary:{externalJudge:run.externalJudge,deterministic:run.deterministic,approved:run.approved,independentJudge:run.independentJudge},
        actionKind:action?.kind,
        actionPayload:action?.payload,
      });
      let execution:unknown=null;
      if(taskId&&run.promotionAllowed&&run.proposal){
        try{
          execution=await executeSafeAgentAction(agent,run.proposal);
          await recordAgentTaskExecution({id:taskId,ok:Boolean((execution as any)?.executed),result:execution});
        }catch(error){
          execution={executed:false,error:String(error)};
          await recordAgentTaskExecution({id:taskId,ok:false,result:execution});
        }
      }
      tasks.push({taskId,agent,approvedByJudges:run.approved,promotionAllowed:run.promotionAllowed,runId:run.runId,execution});
    }else{
      tasks.push({taskId:null,agent,approvedByJudges:false,promotionAllowed:false,error:run.error});
    }
  }
  return{configured:true,tasks};
}

export async function reconcileDailyRevenue(){
  "use step";
  return reconcileRevenue(30);
}

export async function dailyControlWorkflow(){
  "use workflow";
  const [signals,bookingOrders]=await Promise.all([collectControlSignals(),syncProviderRevenue()]);
  const [revenue,incidents,retention,specialists,growthAutopilot]=await Promise.all([
    reconcileDailyRevenue(),persistControlIncidents(signals),applyDataRetention(),dispatchSpecialistAgents(signals),runGrowthAutopilot(),
  ]);
  const advisor=await runDailyAdvisor({
    signals,
    bookingOrders:{
      status:(bookingOrders as any)?.status,
      processed:(bookingOrders as any)?.processed,
      attributed:(bookingOrders as any)?.attributed,
      unattributedCount:Array.isArray((bookingOrders as any)?.unattributed)?(bookingOrders as any).unattributed.length:0,
    },
    revenue:{
      status:(revenue as any)?.status,
      anomalyCount:Array.isArray((revenue as any)?.anomalies)?(revenue as any).anomalies.length:0,
    },
    incidents,
    growthAutopilot,
  });
  const agenda=await buildHumanAgenda(signals);
  return{runType:"daily-control",signals,bookingOrders,revenue,incidents,retention,specialists,growthAutopilot,advisor,agenda,generatedAt:new Date().toISOString()};
}
