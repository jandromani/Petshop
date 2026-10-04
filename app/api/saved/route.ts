import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { z } from "zod";
import { databaseConfigured } from "@/src/db/client";
import { deleteSavedProfile,listSavedStaysForProfile,removeSavedStay,SAVED_PROFILE_COOKIE,upsertSavedStay } from "@/src/db/consumer-memory";
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

const noStore={"Cache-Control":"no-store"};
function json(body:unknown,status=200){
  return NextResponse.json(body,{status,headers:noStore});
}

async function gate(req:Request){
  return enforceRateLimit({key:requestFingerprint(req,"saved-stays"),limit:180,windowSeconds:3600});
}

export async function GET(req:Request){
  const limit=await gate(req);
  if(!limit.allowed)return json({error:"rate-limited"},429);
  if(!databaseConfigured())return json({error:"saved-memory-requires-database"},503);
  try{
    const jar=await cookies();
    const saved=await listSavedStaysForProfile(jar.get(SAVED_PROFILE_COOKIE)?.value);
    return json({saved,durable:true});
  }catch(error){
    console.error(JSON.stringify({level:"error",event:"saved_stays_read_failed",error:String(error).slice(0,300)}));
    return json({error:"saved-memory-unavailable"},503);
  }
}

export async function PUT(req:Request){
  const limit=await gate(req);
  if(!limit.allowed)return json({error:"rate-limited"},429);
  if(!databaseConfigured())return json({error:"saved-memory-requires-database"},503);
  const parsed=StayInput.safeParse(await req.json().catch(()=>null));
  if(!parsed.success)return json({error:"invalid-saved-stay"},400);
  try{
    const jar=await cookies();
    const result=await upsertSavedStay(jar.get(SAVED_PROFILE_COOKIE)?.value,parsed.data);
    if(!result)return json({error:"saved-memory-unavailable"},503);
    const response=json({saved:{...parsed.data,savedAt:result.savedAt},durable:true});
    response.cookies.set(SAVED_PROFILE_COOKIE,result.profileId,cookieOptions);
    return response;
  }catch(error){
    console.error(JSON.stringify({level:"error",event:"saved_stay_write_failed",error:String(error).slice(0,300)}));
    return json({error:"saved-memory-unavailable"},503);
  }
}

export async function DELETE(req:Request){
  const limit=await gate(req);
  if(!limit.allowed)return json({error:"rate-limited"},429);
  if(!databaseConfigured())return json({error:"saved-memory-requires-database"},503);

  const url=new URL(req.url);
  const clearAll=url.searchParams.get("all")==="1";
  const offerId=url.searchParams.get("offerId")?.trim()||"";

  try{
    const jar=await cookies();
    const profileId=jar.get(SAVED_PROFILE_COOKIE)?.value;

    if(clearAll){
      await deleteSavedProfile(profileId);
      const response=json({removed:true,clearedAll:true,durable:true});
      response.cookies.set(SAVED_PROFILE_COOKIE,"",{...cookieOptions,maxAge:0});
      return response;
    }

    if(!offerId||offerId.length>220)return json({error:"invalid-offer-id"},400);
    await removeSavedStay(profileId,offerId);
    return json({removed:true,durable:true});
  }catch(error){
    console.error(JSON.stringify({level:"error",event:"saved_stay_delete_failed",error:String(error).slice(0,300)}));
    return json({error:"saved-memory-unavailable"},503);
  }
}
