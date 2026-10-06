import { cookies } from "next/headers";
import { boundedJson,sameOrigin } from "@/src/core/hotel-partner";
import { HOTEL_COOKIE,hotelAccess,validPortalToken } from "@/src/db/hotel-portal";
import { enforceRateLimit,requestFingerprint } from "@/src/security/rate-limit";

export async function POST(req:Request) {
  if(!sameOrigin(req))return new Response("Forbidden",{status:403});
  const gate=await enforceRateLimit({key:requestFingerprint(req,"hotel-portal-login"),limit:8,windowSeconds:900});
  if(!gate.allowed)return Response.json({error:"rate-limited"},{status:429});
  const body=await boundedJson(req);
  if(!validPortalToken(body?.code)||!await hotelAccess(body.code))return Response.json({error:"invalid-or-expired-code"},{status:401});
  const jar=await cookies();
  jar.set(HOTEL_COOKIE,body.code,{httpOnly:true,secure:process.env.NODE_ENV==="production",sameSite:"lax",path:"/",maxAge:8*3600});
  return Response.json({ok:true},{headers:{"Cache-Control":"private, no-store"}});
}

export async function DELETE(req:Request) {
  if(!sameOrigin(req))return new Response("Forbidden",{status:403});
  (await cookies()).delete(HOTEL_COOKIE);
  return Response.json({ok:true},{headers:{"Cache-Control":"no-store"}});
}
