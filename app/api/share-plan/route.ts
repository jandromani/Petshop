import { z } from "zod";
import { createSharedPlan } from "@/src/db/share";
import { databaseConfigured } from "@/src/db/client";
import { enforceRateLimit,requestFingerprint } from "@/src/security/rate-limit";

const Input=z.object({
  monthlyBudget:z.number().int().min(0).max(20000),
  party:z.enum(["solo","couple"]),
  duration:z.union([z.literal(30),z.literal(60),z.literal(90),z.literal(120),z.literal(180)]),
  mode:z.enum(["world","winter","value","slow"]),
  checkIn:z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  flexibleDays:z.union([z.literal(0),z.literal(7),z.literal(30)]),
});

export async function POST(req:Request){
  const gate=await enforceRateLimit({key:requestFingerprint(req,"share-plan"),limit:30,windowSeconds:3600});
  if(!gate.allowed)return Response.json({error:"rate-limited"},{status:429});
  if(!databaseConfigured())return Response.json({error:"sharing-requires-database"},{status:503});
  const parsed=Input.safeParse(await req.json().catch(()=>null));
  if(!parsed.success)return Response.json({error:"invalid-plan"},{status:400});
  const record=await createSharedPlan(parsed.data);
  if(!record)return Response.json({error:"share-create-failed"},{status:503});
  return Response.json({id:record.id,url:"/plan/"+record.id,expiresAt:record.expiresAt},{status:201,headers:{"Cache-Control":"no-store"}});
}
