import { revenueMetrics,revenueAnomalies } from "@/src/db/revenue";
import { databaseConfigured } from "@/src/db/client";

import { opsAuthorized } from "@/src/security/ops-auth";
export const runtime="nodejs";
export async function GET(req:Request){
  if(!(await opsAuthorized(req)))return new Response("Unauthorized",{status:401});
  if(!databaseConfigured())return Response.json({configured:false},{status:503});
  const metrics=await revenueMetrics(30)||[];
  const anomalies=await revenueAnomalies(30);
  return Response.json({configured:true,window:"30d",byCurrencyAndStatus:metrics,anomalies},{headers:{"Cache-Control":"no-store"}});
}
