import { cookies } from "next/headers";
import { z } from "zod";
import { requestIdFromAccess,REQUEST_ACCESS_COOKIE } from "@/src/db/customer-requests";
import { boundedJson,sameOrigin } from "@/src/security/public-request";
import { enforceRateLimit,requestFingerprint } from "@/src/security/rate-limit";
export async function POST(req:Request){
  if(!sameOrigin(req))return Response.json({error:"origin"},{status:403});
  const gate=await enforceRateLimit({key:requestFingerprint(req,"request-access"),limit:10,windowSeconds:900});if(!gate.allowed)return Response.json({error:"rate-limited"},{status:429});
  const input=z.object({token:z.string().regex(/^[A-Za-z0-9_-]{43}$/)}).strict().safeParse(await boundedJson(req));
  if(!input.success||!await requestIdFromAccess(input.data.token))return Response.json({error:"expired-link"},{status:401});
  const jar=await cookies();jar.set(REQUEST_ACCESS_COOKIE,input.data.token,{httpOnly:true,secure:process.env.NODE_ENV==="production",sameSite:"lax",path:"/",maxAge:60*60*8});
  return Response.json({ok:true},{headers:{"Cache-Control":"private, no-store"}});
}
