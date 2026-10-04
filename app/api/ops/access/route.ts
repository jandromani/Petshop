import { cookies } from "next/headers";
import { createOpsSession,OPS_COOKIE } from "@/src/security/ops-session";
import { enforceRateLimit,requestFingerprint } from "@/src/security/rate-limit";
import { secureSecretEqual } from "@/src/security/secrets";

export const runtime="nodejs";

export async function GET(){
  return new Response("Not found",{status:404});
}

export async function POST(req:Request){
  const gate=await enforceRateLimit({key:requestFingerprint(req,"ops-login"),limit:8,windowSeconds:900});
  if(!gate.allowed) return new Response("Too many attempts",{status:429,headers:{"Cache-Control":"no-store"}});

  const contentType=req.headers.get("content-type")||"";
  let supplied="";
  if(contentType.includes("application/json")){
    const body=await req.json().catch(()=>null) as {key?:string}|null;
    supplied=body?.key||"";
  }else{
    const form=await req.formData().catch(()=>null);
    supplied=String(form?.get("key")||"");
  }

  if(!secureSecretEqual(supplied,process.env.OPS_ACCESS_KEY)) return new Response("Not found",{status:404});

  const jar=await cookies();
  jar.set(OPS_COOKIE,createOpsSession(),{
    httpOnly:true,secure:true,sameSite:"strict",maxAge:60*60*12,path:"/",
  });
  return Response.redirect(new URL("/control",req.url),303);
}
