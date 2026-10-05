import { z } from "zod";
import { upsertComplianceRule } from "@/src/db/compliance-rules";
import { opsAuthorized } from "@/src/security/ops-auth";
import { auditOpsEvent } from "@/src/db/governance";

const Input=z.object({destinationCountry:z.string().min(2).max(100),nationalityScope:z.string().min(2).max(80),ruleKey:z.string().min(2).max(120),ruleType:z.enum(["SHORT_STAY","DIGITAL_NOMAD","RESIDENCE_REGISTRATION","OTHER"]),maxPresenceDays:z.number().int().min(1).max(3650).optional(),windowDays:z.number().int().min(1).max(3650).optional(),minMonthlyIncome:z.number().positive().max(1000000).optional(),incomeCurrency:z.string().regex(/^[A-Z]{3}$/).optional(),sourceUrl:z.string().url().refine(v=>v.startsWith("https://"),"HTTPS required"),sourceTitle:z.string().max(240).optional(),effectiveFrom:z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),effectiveTo:z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),verifiedAt:z.string().datetime(),expiresAt:z.string().datetime(),requirements:z.record(z.string(),z.unknown()).optional()});

export async function POST(req:Request){
  if(!(await opsAuthorized(req)))return new Response("Unauthorized",{status:401});
  const parsed=Input.safeParse(await req.json().catch(()=>null));if(!parsed.success)return Response.json({error:"invalid-compliance-rule",issues:parsed.error.issues},{status:400});
  if(new Date(parsed.data.expiresAt).getTime()<=new Date(parsed.data.verifiedAt).getTime())return Response.json({error:"expiry-must-follow-verification"},{status:400});
  if(parsed.data.effectiveFrom&&parsed.data.effectiveTo&&parsed.data.effectiveFrom>parsed.data.effectiveTo)return Response.json({error:"invalid-effective-window"},{status:400});
  const id=await upsertComplianceRule(parsed.data);
  await auditOpsEvent({actor:"ops",action:"compliance-rule.upsert",resourceType:"compliance-rule",resourceId:id||parsed.data.ruleKey,outcome:id?"VERIFIED":"DB_OFFLINE"});
  return id?Response.json({ok:true,id,humanReviewed:true},{status:201}):Response.json({error:"database-not-configured"},{status:503});
}
