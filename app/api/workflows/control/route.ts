import { start } from "workflow/api";
import { dailyControlWorkflow } from "@/workflows/daily-control";

import { cronAuthorized,opsAuthorized } from "@/src/security/ops-auth";
export const runtime = "nodejs";

export async function POST(req: Request) {
  if(!(cronAuthorized(req)||await opsAuthorized(req))) return new Response("Unauthorized",{status:401});

  const run = await start(dailyControlWorkflow, []);
  console.log(JSON.stringify({level:"info",event:"workflow_started",type:"daily-control",runId:run.runId}));

  return Response.json({accepted:true,runId:run.runId},{status:202,headers:{"Cache-Control":"no-store"}});
}
