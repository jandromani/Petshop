import { start } from "@/src/workflow/start";
import { liveSupplyControlWorkflow } from "@/workflows/live-supply-control";

export const runtime="nodejs";

function authorized(req:Request){
  const secret=process.env.CRON_SECRET;
  return Boolean(secret&&req.headers.get("authorization")==="Bearer "+secret);
}
export async function GET(req:Request){
  if(process.env.SUPPLY_RUNTIME_ENABLED==="false") return Response.json({error:"supply-runtime-disabled"},{status:503});
  if(!authorized(req))return new Response("Unauthorized",{status:401});
  const run=await start(liveSupplyControlWorkflow,[{}]);
  console.log(JSON.stringify({level:"info",event:"scheduled_workflow_started",type:"live-supply-control",runId:run.runId}));
  return Response.json({accepted:true,runId:run.runId,type:"live-supply-control"},{status:202,headers:{"Cache-Control":"no-store"}});
}
