import { z } from "zod";
import { verifyDirectRate } from "@/src/db/direct-supply";
import { opsAuthorized } from "@/src/security/ops-auth";

import { auditOpsEvent } from "@/src/db/governance";
const Input=z.object({
  contractReference:z.string().min(3).max(200),
  bookingUrl:z.string().url().max(2000).optional(),
  trackingQueryParam:z.string().regex(/^[A-Za-z][A-Za-z0-9_-]{0,39}$/).optional(),
  reviewNotes:z.string().max(2000).optional(),
});

export async function POST(req:Request,{params}:{params:Promise<{id:string}>}){
  if(!(await opsAuthorized(req))) return new Response("Unauthorized",{status:401});
  const {id}=await params;
  if(!/^[0-9a-f-]{36}$/i.test(id)) return Response.json({error:"invalid-rate-id"},{status:400});
  const parsed=Input.safeParse(await req.json().catch(()=>null));
  if(!parsed.success) return Response.json({error:"invalid-verification",issues:parsed.error.issues},{status:400});
  try{
    const updated=await verifyDirectRate({id,...parsed.data});
  await auditOpsEvent({actor:"ops",action:"direct-rate.verify",resourceType:"direct-rate",resourceId:id,outcome:updated?"READY_FOR_REVIEW":"NOT_FOUND"});
    if(!updated) return Response.json({error:"rate-not-found-or-database-offline"},{status:404});
    return Response.json({ok:true,id:updated,state:"READY_FOR_REVIEW"});
  }catch(error){
    return Response.json({error:String(error)},{status:400});
  }
}
