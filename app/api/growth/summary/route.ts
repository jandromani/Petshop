import { growthFunnel,acquisitionBreakdown,heroExperimentReadout,searchFriction } from "@/src/db/growth";
import { opsAuthorized } from "@/src/security/ops-auth";

export async function GET(req:Request){
  if(!(await opsAuthorized(req)))return new Response("Not found",{status:404});
  const url=new URL(req.url);
  const days=Math.max(1,Math.min(365,Number(url.searchParams.get("days")||30)));
  const [funnel,acquisition,hero,friction]=await Promise.all([
    growthFunnel(days),acquisitionBreakdown(days),heroExperimentReadout(days),searchFriction(days),
  ]);
  return Response.json({days,funnel,friction,acquisition,experiments:{hero},generatedAt:new Date().toISOString()},{headers:{"Cache-Control":"no-store"}});
}
