import { cookies } from "next/headers";
import { boundedJson,sameOrigin,PartnerRateInput } from "@/src/core/hotel-partner";
import { HOTEL_COOKIE,hotelAccess,proposeHotelRate } from "@/src/db/hotel-portal";
import { enforceRateLimit,requestFingerprint } from "@/src/security/rate-limit";

export async function POST(req:Request) {
  if(!sameOrigin(req))return new Response("Forbidden",{status:403});
  const token=(await cookies()).get(HOTEL_COOKIE)?.value;
  if(!await hotelAccess(token))return new Response("Unauthorized",{status:401});
  const parsed=PartnerRateInput.safeParse(await boundedJson(req));
  if(!parsed.success)return Response.json({error:"invalid-proposal"},{status:400});
  if(parsed.data.validTo<new Date().toISOString().slice(0,10))return Response.json({error:"expired-proposal"},{status:400});
  const gate=await enforceRateLimit({key:requestFingerprint(req,"hotel-proposal"),limit:10,windowSeconds:3600});
  if(!gate.allowed)return Response.json({error:"rate-limited"},{status:429});
  const id=await proposeHotelRate(token,parsed.data);
  if(!id)return Response.json({error:"access-expired"},{status:401});
  return Response.json({ok:true,id,state:"DRAFT"},{status:201,headers:{"Cache-Control":"private, no-store"}});
}
