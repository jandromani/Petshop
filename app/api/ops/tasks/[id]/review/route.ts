import { z } from "zod";
import { opsAuthorized } from "@/src/security/ops-auth";
import { reviewAgentTask } from "@/src/db/agent-tasks";

const Input=z.object({
  status:z.enum(["APPROVED","DISMISSED"]),
  reviewer:z.string().min(1).max(120).default("operator"),
  note:z.string().max(2000).optional(),
});

export async function POST(req:Request,{params}:{params:Promise<{id:string}>}){
  if(!(await opsAuthorized(req)))return new Response("Unauthorized",{status:401});
  const {id}=await params;
  if(!/^[0-9a-f-]{36}$/i.test(id))return Response.json({error:"invalid-task-id"},{status:400});
  const parsed=Input.safeParse(await req.json().catch(()=>null));
  if(!parsed.success)return Response.json({error:"invalid-review",issues:parsed.error.issues},{status:400});
  const ok=await reviewAgentTask({id,...parsed.data});
  return Response.json({ok,status:ok?parsed.data.status:"UNCHANGED"},{status:ok?200:404});
}
