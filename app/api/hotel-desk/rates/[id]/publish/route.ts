import { publishDirectRate } from "@/src/db/direct-supply";
import { opsAuthorized } from "@/src/security/ops-auth";

import { auditOpsEvent } from "@/src/db/governance";
export async function POST(req:Request,{params}:{params:Promise<{id:string}>}){
  if(!(await opsAuthorized(req))) return new Response("Unauthorized",{status:401});
  const {id}=await params;
  if(!/^[0-9a-f-]{36}$/i.test(id)) return Response.json({error:"invalid-rate-id"},{status:400});
  const result=await publishDirectRate(id);
  await auditOpsEvent({actor:"ops",action:"direct-rate.publish",resourceType:"direct-rate",resourceId:id,outcome:result.published?"LIVE":"BLOCKED"});
  return Response.json(result,{status:result.published?200:409});
}
