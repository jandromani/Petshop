import { cookies } from "next/headers";
import { databaseConfigured } from "@/src/db/client";
import { exportSavedProfileData,SAVED_PROFILE_COOKIE } from "@/src/db/consumer-memory";
import { enforceRateLimit,requestFingerprint } from "@/src/security/rate-limit";

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
    const data=await exportSavedProfileData(jar.get(SAVED_PROFILE_COOKIE)?.value);
    const body=JSON.stringify({
      exportedAt:new Date().toISOString(),
      scope:"anonymous-consumer-memory",
      data,
      note:"This export contains the anonymous profile and saved hotel identities and saved-offer references associated with this browser cookie. It does not contain a name, email address or financial profile.",
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
