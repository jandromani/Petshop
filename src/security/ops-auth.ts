import { cookies } from "next/headers";
import { OPS_COOKIE,verifyOpsSession } from "@/src/security/ops-session";

function sameOrigin(req:Request){
  const origin=req.headers.get("origin");
  if(!origin)return false;
  try{return new URL(origin).origin===new URL(req.url).origin;}catch{return false;}
}

export async function opsAuthorized(req:Request,options:{allowBearer?:boolean;requireSameOriginForCookie?:boolean}={}){
  const allowBearer=options.allowBearer!==false;
  if(allowBearer){
    const secret=process.env.OPS_ACCESS_KEY;
    if(secret&&req.headers.get("authorization")==="Bearer "+secret)return true;
  }
  const jar=await cookies();
  const session=jar.get(OPS_COOKIE)?.value;
  if(!verifyOpsSession(session))return false;
  if(options.requireSameOriginForCookie===false)return true;
  if(["GET","HEAD","OPTIONS"].includes(req.method))return true;
  return sameOrigin(req);
}

export function cronAuthorized(req:Request){
  const secret=process.env.CRON_SECRET;
  return Boolean(secret&&req.headers.get("authorization")==="Bearer "+secret);
}
