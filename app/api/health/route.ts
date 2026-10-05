import { getSystemReadiness } from "@/src/system/readiness";

export async function GET(){
  const status=await getSystemReadiness();
  return Response.json({
    ok:status.proof.pass,
    service:"atlas-web",
    softwareProof:status.proof.pass,
    proofKind:status.proof.kind,
    commercialReady:status.infrastructure.databaseReachable&&status.layers.supply.state==="LIVE",
    databaseConfigured:status.infrastructure.databaseConfigured,
    databaseReachable:status.infrastructure.databaseReachable,
    databaseLatencyMs:status.infrastructure.databaseLatencyMs,
    agentConfigured:status.infrastructure.agentConfigured,
    providers:status.infrastructure.providers,
    merchantCheckout:status.infrastructure.merchantCheckout,
    layers:status.layers,
    deployment:{
      environment:process.env.VERCEL_ENV||"local",
      projectId:process.env.VERCEL_PROJECT_ID||null,
      commitSha:process.env.VERCEL_GIT_COMMIT_SHA||null,
      url:process.env.VERCEL_PROJECT_PRODUCTION_URL||process.env.VERCEL_URL||null,
    },
    now:new Date().toISOString(),
  },{headers:{"Cache-Control":"no-store"}});
}
