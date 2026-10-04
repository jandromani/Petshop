import { start } from "@/src/workflow/start";
import { dailyControlWorkflow } from "@/workflows/daily-control";
import {
  claimScheduledRun,dailyScheduleSlot,markScheduledRunStarted,releaseScheduledRunClaim,
} from "@/src/db/scheduled-runs";
import { cronAuthorized } from "@/src/security/ops-auth";

export const runtime = "nodejs";

export async function GET(req: Request) {
  if (!cronAuthorized(req)) return new Response("Unauthorized", { status: 401 });

  const slotKey=dailyScheduleSlot();
  const claim=await claimScheduledRun("daily-control",slotKey);
  if(!claim.claimed){
    return Response.json(
      {accepted:false,duplicate:true,type:"daily-control",slotKey},
      {status:200,headers:{"Cache-Control":"no-store"}},
    );
  }

  try{
    const run = await start(dailyControlWorkflow, []);
    if(claim.durable)await markScheduledRunStarted({jobKey:"daily-control",slotKey,runId:run.runId});
    console.log(JSON.stringify({
      level:"info",event:"scheduled_workflow_started",type:"daily-control",
      runId:run.runId,slotKey,durableClaim:claim.durable,
    }));
    return Response.json(
      {accepted:true,runId:run.runId,slotKey,durableClaim:claim.durable},
      {status:202,headers:{"Cache-Control":"no-store"}},
    );
  }catch(error){
    if(claim.durable)await releaseScheduledRunClaim({jobKey:"daily-control",slotKey}).catch(()=>false);
    throw error;
  }
}
