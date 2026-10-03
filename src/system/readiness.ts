import { databaseConfigured } from "@/src/db/client";
import { liveProviderStatuses } from "@/src/providers/live/registry";
import { AGENTS } from "@/src/agents/registry";
import { getOpsSnapshot } from "@/src/db/ops";
import { runSoftwareProof } from "@/src/system/proof";
import { agentRuntimeCredentialsAvailable,agentRuntimeProvider } from "@/src/agents/llm";

export type LayerState="LIVE"|"READY"|"WAITING_EXTERNAL"|"DEGRADED";

export async function getSystemReadiness(){
  const providers=liveProviderStatuses();
  const configuredProviders=providers.filter(p=>p.configured);
  const db=databaseConfigured();
  const [ops,agentCredentials]=await Promise.all([getOpsSnapshot(),agentRuntimeCredentialsAvailable()]);
  const proof=runSoftwareProof();
  const productionObserved=process.env.VERCEL_ENV==="production";
  const agentConfigured=agentCredentials&&process.env.AGENT_RUNTIME_ENABLED!=="false";
  const runtimeProvider=agentConfigured?agentRuntimeProvider():"none";

  const experienceState:LayerState=productionObserved?"LIVE":"READY";
  const experience={
    state:experienceState,
    score:productionObserved?95:88,
    detail:productionObserved
      ?"Consumer experience is running in a production deployment; commercial claims remain gated by runtime evidence."
      :"Planner, map, share loop, SEO landings, live-offer lane and concierge UI are implemented but production execution is not observed here.",
  };

  const supplyState:LayerState=ops.liveOffers>0?"LIVE":db?"READY":"WAITING_EXTERNAL";
  const supply={
    state:supplyState,
    score:supplyState==="LIVE"?100:supplyState==="READY"?90:70,
    detail:ops.liveOffers>0
      ?String(ops.liveOffers)+" sellable live offers in catalog"
      :db
        ?"Direct Hotel OS and provider adapters are ready; first verified contract/provider inventory is external."
        :"Truth Gate and supply software exist, but persistent DB is required before provider or direct inventory can become live.",
  };

  const moneyState:LayerState=ops.conversions30d>0?"LIVE":db?"READY":"WAITING_EXTERNAL";
  const money={
    state:moneyState,
    score:moneyState==="LIVE"?100:moneyState==="READY"?88:68,
    detail:ops.conversions30d>0
      ?String(ops.conversions30d)+" conversions observed in 30d"
      :"Click attribution, conversion ingestion and reconciliation are implemented; no external conversion proof is claimed.",
  };

  const autonomyState:LayerState=!proof.pass?"DEGRADED":agentConfigured&&db?"READY":"WAITING_EXTERNAL";
  const autonomy={
    state:autonomyState,
    score:autonomyState==="READY"?92:autonomyState==="WAITING_EXTERNAL"?72:55,
    detail:String(Object.keys(AGENTS).length)+" bounded roles, durable workflows, independent-judge enforcement and allowlisted actuation. Runtime provider: "+runtimeProvider+". Persistent DB is required for governed execution.",
  };

  return{
    generatedAt:new Date().toISOString(),
    layers:{experience,supply,money,autonomy},
    infrastructure:{
      productionObserved,
      deploymentCommitSha:process.env.VERCEL_GIT_COMMIT_SHA||null,
      databaseConfigured:db,
      agentConfigured,
      agentRuntimeProvider:runtimeProvider,
      configuredProviders:configuredProviders.map(p=>p.provider),
      providers:providers.map(p=>({provider:p.provider,configured:p.configured,environment:p.environment})),
    },
    ops,
    proof,
  };
}
