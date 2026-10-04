import { opsAuthorized } from "@/src/security/ops-auth";
import { agentRoleMetrics,providerErrorBudgets,runtimeDurationMetrics } from "@/src/db/observability";
import { SLO_TARGETS } from "@/src/system/slo";

export const runtime="nodejs";

export async function GET(req:Request){
  if(!(await opsAuthorized(req)))return new Response("Not found",{status:404});
  const days=Math.max(1,Math.min(365,Number(new URL(req.url).searchParams.get("days")||30)));
  const [agents,providers,durations]=await Promise.all([
    agentRoleMetrics(days),
    providerErrorBudgets(days,SLO_TARGETS.providerWaveSuccessPct),
    runtimeDurationMetrics(days),
  ]);
  return Response.json({
    days,agents,providers,durations,
    retryEvidence:"Workflow-engine retry counts are not exposed by the current runtime and remain null rather than estimated.",
    generatedAt:new Date().toISOString(),
  },{headers:{"Cache-Control":"no-store"}});
}
