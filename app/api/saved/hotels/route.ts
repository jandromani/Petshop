import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { z } from "zod";
import { databaseConfigured } from "@/src/db/client";
import { listSavedHotelsForProfile,removeSavedHotel,SAVED_PROFILE_COOKIE,upsertSavedHotel } from "@/src/db/consumer-memory";
import { enforceRateLimit,requestFingerprint } from "@/src/security/rate-limit";

const HotelInput=z.object({
  hotelId:z.string().min(1).max(220),
  name:z.string().min(1).max(240),
  city:z.string().min(1).max(160),
  country:z.string().min(1).max(160),
  source:z.string().min(1).max(80),
  savedAt:z.string().datetime(),
});
const cookieOptions={httpOnly:true,secure:process.env.NODE_ENV==="production",sameSite:"lax" as const,path:"/",maxAge:60*60*24*365};
const noStore={"Cache-Control":"no-store"};
const json=(body:unknown,status=200)=>NextResponse.json(body,{status,headers:noStore});
async function gate(req:Request){return enforceRateLimit({key:requestFingerprint(req,"saved-hotels"),limit:180,windowSeconds:3600});}

export async function GET(req:Request){
  const limit=await gate(req);if(!limit.allowed)return json({error:"rate-limited"},429);
  if(!databaseConfigured())return json({error:"saved-memory-requires-database"},503);
  try{
    const jar=await cookies();const saved=await listSavedHotelsForProfile(jar.get(SAVED_PROFILE_COOKIE)?.value);
    return json({saved,durable:true});
  }catch(error){
    console.error(JSON.stringify({level:"error",event:"saved_hotels_read_failed",error:String(error).slice(0,300)}));
    return json({error:"saved-memory-unavailable"},503);
  }
}

export async function PUT(req:Request){
  const limit=await gate(req);if(!limit.allowed)return json({error:"rate-limited"},429);
  if(!databaseConfigured())return json({error:"saved-memory-requires-database"},503);
  const parsed=HotelInput.safeParse(await req.json().catch(()=>null));if(!parsed.success)return json({error:"invalid-saved-hotel"},400);
  try{
    const jar=await cookies();const result=await upsertSavedHotel(jar.get(SAVED_PROFILE_COOKIE)?.value,parsed.data);
    if(!result)return json({error:"saved-memory-unavailable"},503);
    const response=json({saved:{...parsed.data,savedAt:result.savedAt},durable:true});
    response.cookies.set(SAVED_PROFILE_COOKIE,result.profileId,cookieOptions);return response;
  }catch(error){
    console.error(JSON.stringify({level:"error",event:"saved_hotel_write_failed",error:String(error).slice(0,300)}));
    return json({error:"saved-memory-unavailable"},503);
  }
}

export async function DELETE(req:Request){
  const limit=await gate(req);if(!limit.allowed)return json({error:"rate-limited"},429);
  if(!databaseConfigured())return json({error:"saved-memory-requires-database"},503);
  const hotelId=new URL(req.url).searchParams.get("hotelId")?.trim()||"";
  if(!hotelId||hotelId.length>220)return json({error:"invalid-hotel-id"},400);
  try{
    const jar=await cookies();await removeSavedHotel(jar.get(SAVED_PROFILE_COOKIE)?.value,hotelId);
    return json({removed:true,durable:true});
  }catch(error){
    console.error(JSON.stringify({level:"error",event:"saved_hotel_delete_failed",error:String(error).slice(0,300)}));
    return json({error:"saved-memory-unavailable"},503);
  }
}
