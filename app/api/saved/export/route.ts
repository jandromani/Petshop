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
    const [data,rateAlerts]=await Promise.all([exportSavedProfileData(profileId),listRateAlerts(profileId)]);
    const body=JSON.stringify({
      exportedAt:new Date().toISOString(),
      scope:"anonymous-consumer-memory",
      data:{...data,rateAlerts},
      note:"This export contains the anonymous profile, saved hotel identities, saved-offer references and rate alerts associated with this browser cookie. It does not contain a name, email address or financial profile.",
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
