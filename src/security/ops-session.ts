import { createHmac,randomBytes,timingSafeEqual } from "node:crypto";

const COOKIE="atlas_ops";
export const OPS_COOKIE=COOKIE;

function secret(){return process.env.OPS_ACCESS_KEY||"";}
function sign(payload:string){return createHmac("sha256",secret()).update(payload).digest("base64url");}

export function createOpsSession(ttlSeconds=60*60*12){
  if(!secret()) throw new Error("OPS_ACCESS_KEY not configured");
  const payload=Buffer.from(JSON.stringify({exp:Math.floor(Date.now()/1000)+ttlSeconds,nonce:randomBytes(18).toString("base64url")})).toString("base64url");
  return payload+"."+sign(payload);
}

export function verifyOpsSession(token:string|undefined){
  if(!token||!secret())return false;
  const [payload,sig]=token.split(".");
  if(!payload||!sig)return false;
  const expected=sign(payload);
  const a=Buffer.from(sig);const b=Buffer.from(expected);
  if(a.length!==b.length||!timingSafeEqual(a,b))return false;
  try{
    const data=JSON.parse(Buffer.from(payload,"base64url").toString("utf8")) as {exp?:number};
    return Number(data.exp)>Math.floor(Date.now()/1000);
  }catch{return false;}
}
