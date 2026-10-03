import { z } from "zod";
import { start } from "workflow/api";
import { supplyWaveWorkflow } from "@/workflows/supply-wave";

import { cronAuthorized,opsAuthorized } from "@/src/security/ops-auth";
export const runtime = "nodejs";

const Input = z.object({
  waveKey: z.string().min(1).max(120),
  regions: z.array(z.string()).max(20).optional(),
  providers: z.array(z.string()).max(10).optional(),
  durations: z.array(z.number().int().positive().max(365)).max(10).optional(),
});

export async function POST(req: Request) {
  if(!(cronAuthorized(req)||await opsAuthorized(req))) return new Response("Unauthorized",{status:401});
  const parsed = Input.safeParse(await req.json().catch(()=>null));
  if (!parsed.success) return Response.json({error:"Invalid wave request"},{status:400});

  const run = await start(supplyWaveWorkflow, [parsed.data]);
  console.log(JSON.stringify({level:"info",event:"workflow_started",type:"supply-wave",runId:run.runId,waveKey:parsed.data.waveKey}));

  return Response.json({accepted:true,runId:run.runId},{status:202,headers:{"Cache-Control":"no-store"}});
}
