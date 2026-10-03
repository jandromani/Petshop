import { z } from "zod";
import { opsAuthorized } from "@/src/security/ops-auth";
import { runGovernedAgent } from "@/src/services/governed-agent";

export const runtime="nodejs";

const Input=z.object({
  agent:z.enum(["orchestrator","supply-scout","route-architect","seo-strategist","content-factory","growth-operator","sem-operator","hotel-sales","revenue-reconciler","support","engineering"]),
  objective:z.string().min(3).max(3000),
  context:z.record(z.string(),z.unknown()).optional(),
});

export async function POST(req:Request){
  if(!(await opsAuthorized(req)))return new Response("Unauthorized",{status:401});
  const parsed=Input.safeParse(await req.json().catch(()=>null));
  if(!parsed.success)return Response.json({error:"Invalid request",issues:parsed.error.issues},{status:400});
  const result=await runGovernedAgent(parsed.data);
  return Response.json(result,{status:result.status});
}
