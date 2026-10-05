import { markMerchantOrderPaid,merchantPaymentEventExists,recordMerchantPaymentEvent,releaseMerchantOrderBySession } from "@/src/db/merchant";
import { verifyStripeWebhook } from "@/src/payments/stripe-rest";

export const runtime="nodejs";
type StripeEvent={id:string;type:string;data?:{object?:Record<string,unknown>}};

export async function POST(req:Request){
  const raw=await req.text();if(!verifyStripeWebhook(raw,req.headers.get("stripe-signature")))return Response.json({error:"invalid-signature"},{status:400});
  let event:StripeEvent;try{event=JSON.parse(raw) as StripeEvent}catch{return Response.json({error:"invalid-json"},{status:400})}
  if(!event?.id||!event.type)return Response.json({error:"invalid-event"},{status:400});
  if(await merchantPaymentEventExists(event.id))return Response.json({received:true,duplicate:true});
  const obj=event.data?.object||{};let applied=true;
  if(event.type==="checkout.session.completed"){const metadata=(obj.metadata||{}) as Record<string,string>;const orderId=metadata.atlas_order_id||String(obj.client_reference_id||"");applied=Boolean(orderId)&&await markMerchantOrderPaid(orderId,typeof obj.payment_intent==="string"?obj.payment_intent:null);}
  else if(event.type==="checkout.session.expired"){const sessionId=typeof obj.id==="string"?obj.id:"";applied=Boolean(sessionId)&&await releaseMerchantOrderBySession(sessionId,"EXPIRED");}
  if(!applied)return Response.json({error:"event-not-applied"},{status:500});
  await recordMerchantPaymentEvent(event.id,event.type);
  return Response.json({received:true});
}
