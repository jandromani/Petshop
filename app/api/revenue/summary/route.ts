import { revenueMetrics,revenueAnomalies } from "@/src/db/revenue";
import { databaseConfigured } from "@/src/db/client";

export const runtime="nodejs";
function authorized(req:Request){
  const secret=process.env.OPS_ACCESS_KEY;
  return Boolean(secret&&req.headers.get("authorization")==="Bearer "+secret);
}
export async function GET(req:Request){
  if(!authorized(req))return new Response("Unauthorized",{status:401});
  if(!databaseConfigured())return Response.json({configured:false},{status:503});
  const metrics=await revenueMetrics(30)||[];
  const anomalies=await revenueAnomalies(30);
  return Response.json({configured:true,window:"30d",byCurrencyAndStatus:metrics,anomalies},{headers:{"Cache-Control":"no-store"}});
}
