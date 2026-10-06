import crypto from "node:crypto";
import { canonicalSiteUrl } from "@/src/system/site-url";

export function merchantCheckoutStatus(){
  return{enabled:process.env.ATLAS_MERCHANT_CHECKOUT_ENABLED==="true",stripeConfigured:Boolean(process.env.STRIPE_SECRET_KEY?.trim()),webhookConfigured:Boolean(process.env.STRIPE_WEBHOOK_SECRET?.trim())};
}

export async function createStripeCheckoutSession(input:{orderId:string;email:string;hotelName:string;city:string;nights:number;currency:string;amount:number;cancelPath:string;language?:"en"|"es"}){
  const status=merchantCheckoutStatus();const key=process.env.STRIPE_SECRET_KEY?.trim();if(!status.enabled||!key)throw new Error("merchant-checkout-not-configured");
  const site=canonicalSiteUrl();const cents=Math.round(input.amount*100);if(cents<50)throw new Error("invalid-checkout-amount");
  const body=new URLSearchParams();
  body.set("mode","payment");body.set("customer_email",input.email);body.set("client_reference_id",input.orderId);
  body.set("success_url",site+(input.language==="es"?"/es":"")+"/checkout/success?session_id={CHECKOUT_SESSION_ID}");
  body.set("cancel_url",site+(input.cancelPath.startsWith("/")?input.cancelPath:"/"));
  body.set("locale",input.language||"en");
  body.set("line_items[0][quantity]","1");body.set("line_items[0][price_data][currency]",input.currency.toLowerCase());
  body.set("line_items[0][price_data][unit_amount]",String(cents));
  body.set("line_items[0][price_data][product_data][name]","Atlas Long Stay · "+input.hotelName);
  body.set("line_items[0][price_data][product_data][description]",input.nights+" nights in "+input.city);
  body.set("metadata[atlas_order_id]",input.orderId);
  const res=await fetch("https://api.stripe.com/v1/checkout/sessions",{method:"POST",headers:{Authorization:"Bearer "+key,"Content-Type":"application/x-www-form-urlencoded","Stripe-Version":"2026-02-25.clover"},body:body.toString()});
  const data=await res.json().catch(()=>null) as {id?:string;url?:string;error?:{message?:string}}|null;
  if(!res.ok||!data?.id||!data.url)throw new Error(data?.error?.message||"stripe-checkout-failed");
  return{id:data.id,url:data.url};
}

export function verifyStripeWebhook(raw:string,signature:string|null){
  const secret=process.env.STRIPE_WEBHOOK_SECRET?.trim();if(!secret||!signature)return false;
  const parts=signature.split(",").map(x=>x.split("="));const t=parts.find(x=>x[0]==="t")?.[1];const signatures=parts.filter(x=>x[0]==="v1").map(x=>x[1]).filter(Boolean);if(!t||!signatures.length)return false;
  const age=Math.abs(Date.now()/1000-Number(t));if(!Number.isFinite(age)||age>300)return false;
  const expected=crypto.createHmac("sha256",secret).update(t+"."+raw).digest("hex");
  return signatures.some(value=>{try{const a=Buffer.from(expected,"hex"),b=Buffer.from(value,"hex");return a.length===b.length&&crypto.timingSafeEqual(a,b)}catch{return false}});
}
