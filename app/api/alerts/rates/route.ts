import { cookies } from "next/headers";
import { z } from "zod";
import { databaseConfigured } from "@/src/db/client";
import { deleteRateAlert,listRateAlerts,upsertRateAlert } from "@/src/db/rate-alerts";
import { SAVED_PROFILE_COOKIE } from "@/src/db/consumer-memory";
import { enforceRateLimit,requestFingerprint } from "@/src/security/rate-limit";

const Input=z.object({
  hotelId:z.string().min(1).max(220),hotelName:z.string().min(1).max(240),city:z.string().min(1).max(160),country:z.string().min(1).max(160),
  checkIn:z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  nights:z.union([z.literal(30),z.literal(60),z.literal(90),z.literal(120),z.literal(180),z.literal(365)]),
  occupancy:z.union([z.literal(1),z.literal(2)]),targetMonthly:z.number().positive().max(50000).nullable().optional(),
});
const noStore={"Cache-Control":"no-store"};
async function gate(req:Request){return enforceRateLimit({key:requestFingerprint(req,"rate-alerts"),limit:120,windowSeconds:3600});}

export async function GET(req:Request){
  const limit=await gate(req);if(!limit.allowed)return Response.json({error:"rate-limited"},{status:429,headers:noStore});
  if(!databaseConfigured())return Response.json({error:"rate-alerts-require-database"},{status:503,headers:noStore});
  const jar=await cookies();
  return Response.json({alerts:await listRateAlerts(jar.get(SAVED_PROFILE_COOKIE)?.value),durable:true},{headers:noStore});
}

export async function PUT(req:Request){
  const limit=await gate(req);if(!limit.allowed)return Response.json({error:"rate-limited"},{status:429,headers:noStore});
  if(!databaseConfigured())return Response.json({error:"rate-alerts-require-database"},{status:503,headers:noStore});
  const parsed=Input.safeParse(await req.json().catch(()=>null));if(!parsed.success)return Response.json({error:"invalid-alert",issues:parsed.error.issues},{status:400,headers:noStore});
  const jar=await cookies();const result=await upsertRateAlert(jar.get(SAVED_PROFILE_COOKIE)?.value,parsed.data);
  if(!result?.alert)return Response.json({error:"rate-alert-unavailable"},{status:503,headers:noStore});
  const response=Response.json({alert:result.alert,durable:true},{status:201,headers:noStore});
  const secure=process.env.NODE_ENV==="production"?"; Secure":"";
  response.headers.append("Set-Cookie",SAVED_PROFILE_COOKIE+"="+result.profileId+"; Path=/; Max-Age="+(60*60*24*365)+"; HttpOnly; SameSite=Lax"+secure);
  return response;
}

export async function DELETE(req:Request){
  const limit=await gate(req);if(!limit.allowed)return Response.json({error:"rate-limited"},{status:429,headers:noStore});
  if(!databaseConfigured())return Response.json({error:"rate-alerts-require-database"},{status:503,headers:noStore});
  const id=new URL(req.url).searchParams.get("id")||"";if(!/^[0-9a-f-]{36}$/i.test(id))return Response.json({error:"invalid-alert-id"},{status:400,headers:noStore});
  const jar=await cookies();await deleteRateAlert(jar.get(SAVED_PROFILE_COOKIE)?.value,id);
  return Response.json({removed:true},{headers:noStore});
}