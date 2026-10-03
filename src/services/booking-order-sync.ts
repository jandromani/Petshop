import { BookingOrdersClient } from "@/src/providers/live/booking-orders";
import { findReferralByTrackingId,getProviderSyncCursor,setProviderSyncCursor } from "@/src/db/revenue";
import { persistConversion } from "@/src/db/ledger";
import { databaseConfigured } from "@/src/db/client";

function record(value:unknown):Record<string,any>{return value&&typeof value==="object"&&!Array.isArray(value)?value as Record<string,any>:{};}
function numberValue(value:unknown,depth=0):number|undefined{
  if(depth>4||value===null||value===undefined)return undefined;
  if(typeof value==="number"&&Number.isFinite(value))return value;
  if(typeof value==="string"&&value.trim()&&Number.isFinite(Number(value)))return Number(value);
  if(typeof value!=="object"||Array.isArray(value))return undefined;
  const r=value as Record<string,unknown>;
  for(const key of ["amount","value","total","actual","estimated"]){
    if(!(key in r))continue;
    const n=numberValue(r[key],depth+1);
    if(n!==undefined)return n;
  }
  return undefined;
}
function findLabel(value:unknown,depth=0):string|undefined{
  if(depth>5||value===null||value===undefined)return undefined;
  if(typeof value==="string"&&value.startsWith("atlas_click-"))return value;
  if(Array.isArray(value)){for(const x of value){const found=findLabel(x,depth+1);if(found)return found;}return undefined;}
  if(typeof value==="object"){
    const r=value as Record<string,unknown>;
    if(typeof r.label==="string"&&r.label.startsWith("atlas_click-"))return r.label;
    for(const x of Object.values(r)){const found=findLabel(x,depth+1);if(found)return found;}
  }
  return undefined;
}
function statusValue(value:unknown){
  const s=String(value||"").toLowerCase();
  if(s.includes("cancel")||s.includes("no_show")||s.includes("no-show"))return "CANCELLED" as const;
  if(s.includes("book")||s.includes("confirm")||s.includes("active"))return "CONFIRMED" as const;
  return "PENDING" as const;
}
function currencyValue(order:Record<string,any>){
  const c=order.currencies;
  if(typeof c==="string")return c;
  if(c&&typeof c==="object")return String(c.booker||c.product||c.accommodation||"")||undefined;
  return typeof order.currency==="string"?order.currency:undefined;
}

export function normalizeBookingOrder(rawOrder:unknown,detail?:unknown){
  const order=record(rawOrder);
  const orderId=String(order.id||"");
  if(!orderId)return null;
  const label=findLabel(order)||findLabel(detail);
  return{
    orderId,
    label,
    commission:numberValue(record(order.commission).actual),
    bookingValue:numberValue(record(order.price).total??order.price),
    currency:currencyValue(order),
    status:statusValue(order.status),
    occurredAt:String(order.updated||order.created||new Date().toISOString()),
  };
}

export async function syncBookingOrders(input:{from?:string;to?:string}={}){
  if(!databaseConfigured())return{configured:false,status:"WAITING_EXTERNAL",processed:0,attributed:0,unattributed:[] as string[]};
  const client=new BookingOrdersClient();
  const provider=client.status();
  if(!provider.configured)return{configured:false,status:"WAITING_EXTERNAL",processed:0,attributed:0,unattributed:[] as string[]};

  const now=new Date();
  const cursor=await getProviderSyncCursor("booking","orders");
  const initialHours=Math.max(1,Math.min(24*30,Number(process.env.BOOKING_ORDER_INITIAL_LOOKBACK_HOURS||24)));
  const from=input.from||cursor||new Date(now.getTime()-initialHours*3600000).toISOString();
  const to=input.to||now.toISOString();
  let page: string|undefined;
  let processed=0,attributed=0;
  const unattributed:string[]=[];

  do{
    const response=await client.listOrders({updatedFrom:from,updatedTo:to,currency:"EUR",maximumResults:100,page});
    const orders=Array.isArray(response.data)?response.data:[];
    const ids=orders.map(o=>String(record(o).id||"")).filter(Boolean);
    let details:unknown[]=[];
    if(ids.length){
      try{details=(await client.accommodationDetails(ids,"EUR")).data||[];}catch{}
    }
    const detailById=new Map(details.map(d=>[String(record(d).id||""),d]));

    for(const rawOrder of orders){
      processed++;
      const order=record(rawOrder);
      const orderId=String(order.id||"");
      if(!orderId)continue;
      const detail=detailById.get(orderId);
      const normalized=normalizeBookingOrder(order,detail);
      if(!normalized?.label){unattributed.push(orderId);continue;}
      const referral=await findReferralByTrackingId(normalized.label);
      if(!referral){unattributed.push(orderId);continue;}
      const result=await persistConversion({
        clickId:referral.click_id,provider:"booking",providerConversionId:orderId,bookingValue:normalized.bookingValue,
        commission:normalized.commission,currency:normalized.currency,status:normalized.status,occurredAt:normalized.occurredAt,
        rawPayload:{order,accommodation:detail,label:normalized.label},
      });
      if(result.persisted)attributed++;
    }
    page=String(record(response.metadata).next_page||record(response.metadata).next_page_token||"")||undefined;
  }while(page);

  await setProviderSyncCursor("booking","orders",to);
  return{configured:true,status:"COMPLETE",from,to,processed,attributed,unattributed:[...new Set(unattributed)]};
}
