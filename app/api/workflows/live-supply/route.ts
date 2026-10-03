import { z } from "zod";
import { start } from "workflow/api";
import { liveSupplyControlWorkflow } from "@/workflows/live-supply-control";

import { opsAuthorized } from "@/src/security/ops-auth";
const Input=z.object({
  checkIn:z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  durations:z.array(z.union([z.literal(30),z.literal(60),z.literal(90),z.literal(120),z.literal(180)])).max(5).optional(),
  adults:z.array(z.union([z.literal(1),z.literal(2)])).max(2).optional(),
  maxDestinations:z.number().int().min(1).max(30).optional(),
  maxMappedHotels:z.number().int().min(1).max(200).optional(),
});
export async function POST(req:Request){
  if(process.env.SUPPLY_RUNTIME_ENABLED==="false") return Response.json({error:"supply-runtime-disabled"},{status:503});
  if(!(await opsAuthorized(req)))return new Response("Unauthorized",{status:401});
  const parsed=Input.safeParse(await req.json().catch(()=>({})));
  if(!parsed.success)return Response.json({error:"invalid-live-control",issues:parsed.error.issues},{status:400});
  const run=await start(liveSupplyControlWorkflow,[parsed.data]);
  return Response.json({accepted:true,runId:run.runId},{status:202});
}
