import { opsAuthorized } from "@/src/security/ops-auth";
import { agentRoleMetrics,providerErrorBudgets } from "@/src/db/observability";
import { SLO_TARGETS } from "@/src/system/slo";

export const runtime="nodejs";

export async function GET(req:Request){
  if(!(await opsAuthorized(req)))return new Response("Not found",{status:404});
  const days=Math.max(1,Math.min(365,Number(new URL(req.url).searchParams.get("days")||30)));
  const [agents,providers]=await Promise.all([
    agentRoleMetrics(days),
    providerErrorBudgets(days,SLO_TARGETS.providerWaveSuccessPct),
  ]);
  return Response.json({days,agents,providers,generatedAt:new Date().toISOString()},{headers:{"Cache-Control":"no-store"}});
}
