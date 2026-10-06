import { cookies } from "next/headers";
import { z } from "zod";
import { createMerchantOrder,releaseMerchantOrder } from "@/src/db/merchant";
import { createStripeCheckoutSession,merchantCheckoutStatus } from "@/src/payments/stripe-rest";
import { enforceRateLimit,requestFingerprint } from "@/src/security/rate-limit";
import { ensureSavedProfile,SAVED_PROFILE_COOKIE } from "@/src/db/consumer-memory";

export const runtime="nodejs";
const Input=z.object({language:z.enum(["en","es"]).default("en"),offerId:z.string().uuid(),checkIn:z.string().regex(/^\d{4}-\d{2}-\d{2}$/),nights:z.union([z.literal(30),z.literal(60),z.literal(90)]),occupancy:z.union([z.literal(1),z.literal(2)]),email:z.string().trim().toLowerCase().email().max(254),sourcingRequestId:z.string().uuid().optional()});

export async function POST(req:Request){
  const gate=await enforceRateLimit({key:requestFingerprint(req,"merchant-checkout"),limit:6,windowSeconds:3600});
  if(!gate.allowed)return Response.json({error:"rate-limited"},{status:429,headers:{"Cache-Control":"no-store"}});
  const config=merchantCheckoutStatus();if(!config.enabled||!config.stripeConfigured)return Response.json({error:"merchant-checkout-not-active"},{status:503,headers:{"Cache-Control":"no-store"}});
  const parsed=Input.safeParse(await req.json().catch(()=>null));if(!parsed.success)return Response.json({error:"invalid-checkout",issues:parsed.error.issues},{status:400});
  if(new Date(parsed.data.checkIn+"T00:00:00Z").getTime()<Date.now()-86400000)return Response.json({error:"check-in-in-past"},{status:400});
  const jar=await cookies();
  const profileId=await ensureSavedProfile(jar.get(SAVED_PROFILE_COOKIE)?.value);
  if(profileId)jar.set(SAVED_PROFILE_COOKIE,profileId,{httpOnly:true,secure:process.env.NODE_ENV==="production",sameSite:"lax",path:"/",maxAge:60*60*24*365});
  const order=await createMerchantOrder({offerId:parsed.data.offerId,customerEmail:parsed.data.email,checkIn:parsed.data.checkIn,nights:parsed.data.nights,occupancy:parsed.data.occupancy,sourcingRequestId:parsed.data.sourcingRequestId,consumerProfileId:profileId??undefined});
  if(!order)return Response.json({error:"merchant-offer-unavailable"},{status:409,headers:{"Cache-Control":"no-store"}});
  try{
    const session=await createStripeCheckoutSession({orderId:order.id,email:parsed.data.email,hotelName:order.quote.hotelName,city:order.quote.city,nights:order.quote.nights,currency:order.quote.currency,amount:order.quote.customerTotal,language:parsed.data.language,cancelPath:"/live/"+encodeURIComponent(order.quote.slug)});
    const { attachCheckoutSession }=await import("@/src/db/merchant");const attached=await attachCheckoutSession(order.id,session.id);
    if(!attached){await releaseMerchantOrder(order.id,"PAYMENT_FAILED");return Response.json({error:"checkout-state-conflict"},{status:409});}
    return Response.json({ok:true,url:session.url,orderId:order.id,quote:{hotelName:order.quote.hotelName,city:order.quote.city,nights:order.quote.nights,currency:order.quote.currency,total:order.quote.customerTotal}},{status:201,headers:{"Cache-Control":"no-store"}});
  }catch(error){await releaseMerchantOrder(order.id,"PAYMENT_FAILED");return Response.json({error:"checkout-provider-error",detail:String(error).slice(0,240)},{status:502,headers:{"Cache-Control":"no-store"}});}
}
