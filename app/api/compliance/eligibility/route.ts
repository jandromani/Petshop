import { z } from "zod";
import { assessSchengen90In180,parsePresenceRanges } from "@/src/compliance/schengen";
import { evaluateComplianceRule,findFreshComplianceRule } from "@/src/db/compliance-rules";
import { enforceRateLimit,requestFingerprint } from "@/src/security/rate-limit";

const Query=z.object({
  destinationCountry:z.string().min(2).max(100),
  nationalityScope:z.string().min(2).max(80),
  ruleType:z.enum(["SHORT_STAY","DIGITAL_NOMAD","RESIDENCE_REGISTRATION","OTHER"]),
  stayPresenceDays:z.coerce.number().int().min(1).max(3650),
  monthlyIncome:z.coerce.number().positive().max(1000000).optional(),
  checkIn:z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  nights:z.coerce.number().int().min(1).max(365).optional(),
  previous:z.string().max(4000).optional(),
});

export async function GET(req:Request){
  const gate=await enforceRateLimit({key:requestFingerprint(req,"compliance-eligibility"),limit:60,windowSeconds:60});
  if(!gate.allowed)return Response.json({error:"rate-limited"},{status:429});
  const url=new URL(req.url);
  const parsed=Query.safeParse(Object.fromEntries(url.searchParams.entries()));
  if(!parsed.success)return Response.json({error:"invalid-query",issues:parsed.error.issues},{status:400});
  const rule=await findFreshComplianceRule(parsed.data).catch(()=>null);
  let rolling:null|ReturnType<typeof assessSchengen90In180>=null;
  const schengenRule=Boolean(rule&&rule.rule_type==="SHORT_STAY"&&rule.max_presence_days===90&&rule.window_days===180);
  if(schengenRule&&parsed.data.checkIn&&parsed.data.nights){
    try{
      rolling=assessSchengen90In180(parsePresenceRanges(parsed.data.previous||""),parsed.data.checkIn,parsed.data.nights);
    }catch{
      return Response.json({error:"invalid-presence-history",hint:"Use YYYY-MM-DD..YYYY-MM-DD, separated by commas or new lines."},{status:400});
    }
  }
  const base=evaluateComplianceRule(rule,{
    stayPresenceDays:rolling?.presenceDays??parsed.data.stayPresenceDays,
    monthlyIncome:parsed.data.monthlyIncome,
  });
  const assessment=rolling&&!rolling.eligible
    ?{...base,state:"FAIL_SCREEN" as const,reasons:[...base.reasons,"Rolling 90/180 history breaches on "+rolling.firstBreachDate+"."]}
    :base;
  return Response.json({
    query:parsed.data,
    assessment,
    rollingAssessment:rolling,
    generatedAt:new Date().toISOString(),
  },{headers:{"Cache-Control":"no-store"}});
}
