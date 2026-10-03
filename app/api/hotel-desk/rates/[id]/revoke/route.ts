import { revokeDirectRate } from "@/src/db/direct-supply";
import { opsAuthorized } from "@/src/security/ops-auth";

import { auditOpsEvent } from "@/src/db/governance";
export async function POST(req:Request,{params}:{params:Promise<{id:string}>}){
  if(!(await opsAuthorized(req))) return new Response("Unauthorized",{status:401});
  const {id}=await params;
  if(!/^[0-9a-f-]{36}$/i.test(id)) return Response.json({error:"invalid-rate-id"},{status:400});
  const revoked=await revokeDirectRate(id);
  await auditOpsEvent({actor:"ops",action:"direct-rate.revoke",resourceType:"direct-rate",resourceId:id,outcome:revoked?"REVOKED":"UNCHANGED"});
  return Response.json({ok:revoked,state:revoked?"REVOKED":"UNCHANGED"},{status:revoked?200:404});
}
