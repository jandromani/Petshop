import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { z } from "zod";
import { databaseConfigured } from "@/src/db/client";
import { listSavedStaysForProfile,removeSavedStay,SAVED_PROFILE_COOKIE,upsertSavedStay } from "@/src/db/consumer-memory";
import { enforceRateLimit,requestFingerprint } from "@/src/security/rate-limit";

const StayInput=z.object({
  offerId:z.string().min(1).max(220),
  slug:z.string().min(1).max(180),
  name:z.string().min(1).max(240),
  city:z.string().min(1).max(160),
  country:z.string().min(1).max(160),
  provider:z.string().min(1).max(80),
  savedMonthly:z.number().positive().max(100000),
  currency:z.string().regex(/^[A-Z]{3}$/),
  verifiedAt:z.string().datetime(),
  expiresAt:z.string().datetime().nullable(),
  savedAt:z.string().datetime(),
});

const cookieOptions={
  httpOnly:true,
  secure:process.env.NODE_ENV==="production",
  sameSite:"lax" as const,
  path:"/",
  maxAge:60*60*24*365,
};

async function gate(req:Request){
  return enforceRateLimit({key:requestFingerprint(req,"saved-stays"),limit:180,windowSeconds:3600});
}

export async function GET(req:Request){
  const limit=await gate(req);
  if(!limit.allowed)return NextResponse.json({error:"rate-limited"},{status:429});
  if(!databaseConfigured())return NextResponse.json({error:"saved-memory-requires-database"},{status:503});
  try{
    const jar=await cookies();
    const saved=await listSavedStaysForProfile(jar.get(SAVED_PROFILE_COOKIE)?.value);
    return NextResponse.json({saved,durable:true},{headers:{"Cache-Control":"no-store"}});
  }catch(error){
    console.error(JSON.stringify({level:"error",event:"saved_stays_read_failed",error:String(error).slice(0,300)}));
    return NextResponse.json({error:"saved-memory-unavailable"},{status:503});
  }
}

export async function PUT(req:Request){
  const limit=await gate(req);
  if(!limit.allowed)return NextResponse.json({error:"rate-limited"},{status:429});
  if(!databaseConfigured())return NextResponse.json({error:"saved-memory-requires-database"},{status:503});
  const parsed=StayInput.safeParse(await req.json().catch(()=>null));
  if(!parsed.success)return NextResponse.json({error:"invalid-saved-stay"},{status:400});
  try{
    const jar=await cookies();
    const result=await upsertSavedStay(jar.get(SAVED_PROFILE_COOKIE)?.value,parsed.data);
    if(!result)return NextResponse.json({error:"saved-memory-unavailable"},{status:503});
    const response=NextResponse.json({saved:{...parsed.data,savedAt:result.savedAt},durable:true},{status:200,headers:{"Cache-Control":"no-store"}});
    response.cookies.set(SAVED_PROFILE_COOKIE,result.profileId,cookieOptions);
    return response;
  }catch(error){
    console.error(JSON.stringify({level:"error",event:"saved_stay_write_failed",error:String(error).slice(0,300)}));
    return NextResponse.json({error:"saved-memory-unavailable"},{status:503});
  }
}

export async function DELETE(req:Request){
  const limit=await gate(req);
  if(!limit.allowed)return NextResponse.json({error:"rate-limited"},{status:429});
  if(!databaseConfigured())return NextResponse.json({error:"saved-memory-requires-database"},{status:503});
  const offerId=new URL(req.url).searchParams.get("offerId")?.trim()||"";
  if(!offerId||offerId.length>220)return NextResponse.json({error:"invalid-offer-id"},{status:400});
  try{
    const jar=await cookies();
    await removeSavedStay(jar.get(SAVED_PROFILE_COOKIE)?.value,offerId);
    return NextResponse.json({removed:true,durable:true},{headers:{"Cache-Control":"no-store"}});
  }catch(error){
    console.error(JSON.stringify({level:"error",event:"saved_stay_delete_failed",error:String(error).slice(0,300)}));
    return NextResponse.json({error:"saved-memory-unavailable"},{status:503});
  }
}
