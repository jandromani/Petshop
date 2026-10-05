import { growthFunnel,productFunnel,acquisitionBreakdown,heroExperimentReadout,searchFriction,paidAttributionBreakdown } from "@/src/db/growth";
import { opsAuthorized } from "@/src/security/ops-auth";

export async function GET(req:Request){
  if(!(await opsAuthorized(req)))return new Response("Not found",{status:404});
  const url=new URL(req.url);
  const days=Math.max(1,Math.min(365,Number(url.searchParams.get("days")||30)));
  const [funnel,product,acquisition,hero,friction,paid]=await Promise.all([
    growthFunnel(days),productFunnel(days),acquisitionBreakdown(days),heroExperimentReadout(days),searchFriction(days),paidAttributionBreakdown(days),
  ]);
  return Response.json({days,funnel,product,friction,acquisition,paidAttribution:paid,experiments:{hero},generatedAt:new Date().toISOString()},{headers:{"Cache-Control":"no-store"}});
}
