import { exportRequestData,REQUEST_ACCESS_COOKIE } from "@/src/db/customer-requests";
import { cookies } from "next/headers";
import { databaseConfigured } from "@/src/db/client";
import { exportSavedProfileData,SAVED_PROFILE_COOKIE } from "@/src/db/consumer-memory";
import { enforceRateLimit,requestFingerprint } from "@/src/security/rate-limit";
import { listRateAlerts } from "@/src/db/rate-alerts";

export const runtime="nodejs";

export async function GET(req:Request){
  const limit=await enforceRateLimit({
    key:requestFingerprint(req,"saved-memory-export"),
    limit:20,
    windowSeconds:3600,
  });
  if(!limit.allowed){
    return Response.json({error:"rate-limited"},{status:429,headers:{"Cache-Control":"no-store"}});
  }
  if(!databaseConfigured()){
    return Response.json({error:"saved-memory-requires-database"},{status:503,headers:{"Cache-Control":"no-store"}});
  }

  try{
    const jar=await cookies();
    const profileId=jar.get(SAVED_PROFILE_COOKIE)?.value;
    const [data,rateAlerts,requests]=await Promise.all([exportSavedProfileData(profileId),listRateAlerts(profileId),exportRequestData(profileId,jar.get(REQUEST_ACCESS_COOKIE)?.value)]);
    const body=JSON.stringify({
      exportedAt:new Date().toISOString(),
      scope:"anonymous-consumer-memory",
      data:{...data,rateAlerts,requests},
      note:"This export contains saved hotels, offers, rate alerts and private requests accessible from this browser profile or an authenticated request link. Requests include the email and contact consent you provided. Keep this export private.",
    },null,2);
    return new Response(body,{
      status:200,
      headers:{
        "Content-Type":"application/json; charset=utf-8",
        "Content-Disposition":'attachment; filename="atlas-anonymous-memory.json"',
        "Cache-Control":"no-store",
        "X-Content-Type-Options":"nosniff",
      },
    });
  }catch(error){
    console.error(JSON.stringify({level:"error",event:"saved_memory_export_failed",error:String(error).slice(0,300)}));
    return Response.json({error:"saved-memory-export-unavailable"},{status:503,headers:{"Cache-Control":"no-store"}});
  }
}
