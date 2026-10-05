import { z } from "zod";
import { acquisitionSpendSummary,recordAcquisitionSpend } from "@/src/db/acquisition-spend";
import { opsAuthorized } from "@/src/security/ops-auth";
import { auditOpsEvent } from "@/src/db/governance";

const Input=z.object({network:z.string().min(2).max(80),campaign:z.string().max(160).optional(),spendDate:z.string().regex(/^\d{4}-\d{2}-\d{2}$/),currency:z.string().regex(/^[A-Z]{3}$/).default("EUR"),amount:z.number().min(0).max(1000000),sourceReference:z.string().max(240).optional()});

export async function GET(req:Request){
  if(!(await opsAuthorized(req)))return new Response("Not found",{status:404});const days=Math.max(1,Math.min(365,Number(new URL(req.url).searchParams.get("days")||30)));return Response.json(await acquisitionSpendSummary(days),{headers:{"Cache-Control":"no-store"}});
}

export async function POST(req:Request){
  if(!(await opsAuthorized(req)))return new Response("Unauthorized",{status:401});const parsed=Input.safeParse(await req.json().catch(()=>null));if(!parsed.success)return Response.json({error:"invalid-spend",issues:parsed.error.issues},{status:400});
  const id=await recordAcquisitionSpend(parsed.data);await auditOpsEvent({actor:"ops",action:"acquisition-spend.upsert",resourceType:"acquisition-spend",resourceId:id||"none",outcome:id?"RECORDED":"DB_OFFLINE"});
  return id?Response.json({ok:true,id},{status:201}):Response.json({error:"database-not-configured"},{status:503});
}
