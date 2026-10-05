import { z } from "zod";
import { evaluateComplianceRule,findFreshComplianceRule } from "@/src/db/compliance-rules";
import { enforceRateLimit,requestFingerprint } from "@/src/security/rate-limit";

const Query=z.object({destinationCountry:z.string().min(2).max(100),nationalityScope:z.string().min(2).max(80),ruleType:z.enum(["SHORT_STAY","DIGITAL_NOMAD","RESIDENCE_REGISTRATION","OTHER"]),stayPresenceDays:z.coerce.number().int().min(1).max(3650),monthlyIncome:z.coerce.number().positive().max(1000000).optional()});

export async function GET(req:Request){
  const gate=await enforceRateLimit({key:requestFingerprint(req,"compliance-eligibility"),limit:60,windowSeconds:60});if(!gate.allowed)return Response.json({error:"rate-limited"},{status:429});
  const url=new URL(req.url);const parsed=Query.safeParse(Object.fromEntries(url.searchParams.entries()));if(!parsed.success)return Response.json({error:"invalid-query",issues:parsed.error.issues},{status:400});
  const rule=await findFreshComplianceRule(parsed.data).catch(()=>null);const assessment=evaluateComplianceRule(rule,{stayPresenceDays:parsed.data.stayPresenceDays,monthlyIncome:parsed.data.monthlyIncome});
  return Response.json({query:parsed.data,assessment,generatedAt:new Date().toISOString()},{headers:{"Cache-Control":"no-store"}});
}
