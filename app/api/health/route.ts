import { getSystemReadiness } from "@/src/system/readiness";

export async function GET(){
  const status=await getSystemReadiness();
  return Response.json({
    ok:status.proof.pass,
    service:"atlas-web",
    softwareProof:status.proof.pass,
    commercialReady:status.infrastructure.databaseConfigured&&status.infrastructure.configuredProviders.length>0&&status.layers.supply.state==="LIVE",
    databaseConfigured:status.infrastructure.databaseConfigured,
    agentConfigured:status.infrastructure.agentConfigured,
    providers:status.infrastructure.providers,
    layers:status.layers,
    now:new Date().toISOString(),
  },{headers:{"Cache-Control":"no-store"}});
}
