import { z } from "zod";
import { configureMerchantRate } from "@/src/db/merchant";
import { opsAuthorized } from "@/src/security/ops-auth";
import { auditOpsEvent } from "@/src/db/governance";

const Input=z.discriminatedUnion("channelModel",[
  z.object({channelModel:z.literal("REFERRAL")}),
  z.object({channelModel:z.enum(["MERCHANT","EXCLUSIVE_MERCHANT"]),hotelNetMonthly:z.number().positive().max(100000),inventoryUnits:z.number().int().min(1).max(1000),merchantTermsVerified:z.literal(true)}),
]);

export async function POST(req:Request,{params}:{params:Promise<{id:string}>}){
  if(!(await opsAuthorized(req)))return new Response("Unauthorized",{status:401});
  const{id}=await params;if(!/^[0-9a-f-]{36}$/i.test(id))return Response.json({error:"invalid-rate-id"},{status:400});
  const parsed=Input.safeParse(await req.json().catch(()=>null));if(!parsed.success)return Response.json({error:"invalid-merchant-config",issues:parsed.error.issues},{status:400});
  const updated=await configureMerchantRate({id,...parsed.data});
  await auditOpsEvent({actor:"ops",action:"direct-rate.merchant-config",resourceType:"direct-rate",resourceId:id,outcome:updated?"DRAFT":"NOT_FOUND"});
  return updated?Response.json({ok:true,id:updated,state:"DRAFT",requiresReverification:true}):Response.json({error:"rate-not-found-or-database-offline"},{status:404});
}
