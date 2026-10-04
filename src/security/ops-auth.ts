import { cookies } from "next/headers";
import { OPS_COOKIE,verifyOpsSession } from "@/src/security/ops-session";
import { bearerSecretAuthorized } from "@/src/security/secrets";

function sameOrigin(req:Request){
  const origin=req.headers.get("origin");
  if(!origin)return false;
  try{return new URL(origin).origin===new URL(req.url).origin;}catch{return false;}
}

export async function opsAuthorized(req:Request,options:{allowBearer?:boolean;requireSameOriginForCookie?:boolean}={}){
  const allowBearer=options.allowBearer!==false;
  if(allowBearer&&bearerSecretAuthorized(req,process.env.OPS_ACCESS_KEY))return true;
  const jar=await cookies();
  const session=jar.get(OPS_COOKIE)?.value;
  if(!verifyOpsSession(session))return false;
  if(options.requireSameOriginForCookie===false)return true;
  if(["GET","HEAD","OPTIONS"].includes(req.method))return true;
  return sameOrigin(req);
}

export function cronAuthorized(req:Request){
  return bearerSecretAuthorized(req,process.env.CRON_SECRET);
}
