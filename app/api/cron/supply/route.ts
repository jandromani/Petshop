import { start } from "@/src/workflow/start";
import { liveSupplyControlWorkflow } from "@/workflows/live-supply-control";
import {
  claimScheduledRun,dailyScheduleSlot,markScheduledRunStarted,releaseScheduledRunClaim,
} from "@/src/db/scheduled-runs";

export const runtime="nodejs";

function authorized(req:Request){
  const secret=process.env.CRON_SECRET;
  return Boolean(secret&&req.headers.get("authorization")==="Bearer "+secret);
}

export async function GET(req:Request){
  if(process.env.SUPPLY_RUNTIME_ENABLED==="false"){
    return Response.json({error:"supply-runtime-disabled"},{status:503});
  }
  if(!authorized(req))return new Response("Unauthorized",{status:401});

  const slotKey=dailyScheduleSlot();
  const jobKey="live-supply-control";
  const claim=await claimScheduledRun(jobKey,slotKey);
  if(!claim.claimed){
    return Response.json(
      {accepted:false,duplicate:true,type:jobKey,slotKey},
      {status:200,headers:{"Cache-Control":"no-store"}},
    );
  }

  try{
    const run=await start(liveSupplyControlWorkflow,[{}]);
    if(claim.durable)await markScheduledRunStarted({jobKey,slotKey,runId:run.runId});
    console.log(JSON.stringify({
      level:"info",event:"scheduled_workflow_started",type:jobKey,
      runId:run.runId,slotKey,durableClaim:claim.durable,
    }));
    return Response.json(
      {accepted:true,runId:run.runId,type:jobKey,slotKey,durableClaim:claim.durable},
      {status:202,headers:{"Cache-Control":"no-store"}},
    );
  }catch(error){
    if(claim.durable)await releaseScheduledRunClaim({jobKey,slotKey}).catch(()=>false);
    throw error;
  }
}
