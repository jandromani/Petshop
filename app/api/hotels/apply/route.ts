import { createHotelLead } from "@/src/db/direct-supply";
import { HotelApplicationInput,boundedJson,sameOrigin } from "@/src/core/hotel-partner";
import { enforceRateLimit,requestFingerprint } from "@/src/security/rate-limit";

export async function POST(req:Request) {
  if(!sameOrigin(req))return Response.json({error:"origin-required"},{status:403});
  const parsed=HotelApplicationInput.safeParse(await boundedJson(req));
  if(!parsed.success)return Response.json({error:"invalid-application"},{status:400});
  if(parsed.data.company)return Response.json({ok:true},{status:202});
  try{
    const gate=await enforceRateLimit({key:requestFingerprint(req,"hotel-application"),limit:3,windowSeconds:3600});
    if(!gate.allowed)return Response.json({error:"rate-limited"},{status:429});
    const {contactConsent,company,...lead}=parsed.data;
    // Always a new unverified lead: a public submission cannot take over an existing partner.
    const id=await createHotelLead({...lead,source:"hotel-public-application",notes:{contactConsent,consentAt:new Date().toISOString(),purpose:"hotel-partnership",identityVerified:false}});
    if(!id)return Response.json({error:"intake-unavailable"},{status:503});
    return Response.json({ok:true,status:"AWAITING_CONTACT_REVIEW"},{status:201,headers:{"Cache-Control":"no-store"}});
  }catch{return Response.json({error:"intake-unavailable"},{status:503});}
}
