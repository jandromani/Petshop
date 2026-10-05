import { getDatabase } from "@/src/db/client";
import { addDays } from "@/src/core/search";

export type MerchantQuote={offerId:string;hotelName:string;city:string;country:string;slug:string;checkIn:string;checkOut:string;nights:30|60|90;occupancy:1|2;currency:string;customerTotal:number;hotelCost:number;platformRevenue:number;takeRate:number;monthlyPrice:number;availableUnits:number;channelModel:"MERCHANT"|"EXCLUSIVE_MERCHANT"};
type MerchantRateRow={offer_id:string;hotel_name:string;city:string;country:string;slug:string;min_nights:number;max_nights:number|null;max_guests:number;monthly_price:number;hotel_net_monthly:number|null;currency:string;valid_from:string;valid_to:string;channel_model:string;merchant_enabled:boolean;merchant_terms_verified:boolean;contract_verified:boolean;publication_state:string;inventory_units:number;reserved_units:number;sold_units:number};
const round2=(n:number)=>Math.round(n*100)/100;

function quoteFromRate(rate:MerchantRateRow,checkIn:string,nights:30|60|90,occupancy:1|2,availableUnitsOverride?:number):MerchantQuote|null{
  if(!["MERCHANT","EXCLUSIVE_MERCHANT"].includes(rate.channel_model)||!rate.merchant_enabled||!rate.merchant_terms_verified||!rate.contract_verified||rate.publication_state!=="LIVE")return null;
  if(rate.hotel_net_monthly===null||rate.hotel_net_monthly<=0||rate.hotel_net_monthly>rate.monthly_price)return null;
  if(nights<rate.min_nights||(rate.max_nights!==null&&nights>rate.max_nights)||occupancy>rate.max_guests)return null;
  const checkOut=addDays(checkIn,nights);if(checkIn<rate.valid_from||checkOut>addDays(rate.valid_to,1))return null;
  const availableUnits=Math.max(0,availableUnitsOverride??rate.inventory_units);if(availableUnits<1)return null;
  const customerTotal=round2(rate.monthly_price*nights/30),hotelCost=round2(rate.hotel_net_monthly*nights/30),platformRevenue=round2(customerTotal-hotelCost);
  return{offerId:rate.offer_id,hotelName:rate.hotel_name,city:rate.city,country:rate.country,slug:rate.slug,checkIn,checkOut,nights,occupancy,currency:rate.currency,customerTotal,hotelCost,platformRevenue,takeRate:customerTotal>0?platformRevenue/customerTotal:0,monthlyPrice:Number(rate.monthly_price),availableUnits,channelModel:rate.channel_model as "MERCHANT"|"EXCLUSIVE_MERCHANT"};
}

export async function getMerchantCheckoutQuote(input:{offerId:string;checkIn:string;nights:30|60|90;occupancy:1|2}){
  const sql=getDatabase();if(!sql)return null;
  const rows=await sql<MerchantRateRow[]>`
    select r.id::text as offer_id,h.name as hotel_name,h.city,h.country,h.slug,r.min_nights,r.max_nights,r.max_guests,r.monthly_price::float,r.hotel_net_monthly::float,r.currency,r.valid_from::text,r.valid_to::text,r.channel_model,r.merchant_enabled,r.merchant_terms_verified,r.contract_verified,r.publication_state,r.inventory_units,r.reserved_units,r.sold_units
    from direct_rate_offers r join canonical_hotels h on h.id=r.canonical_hotel_id where r.id=${input.offerId}::uuid limit 1
  `;
  const rate=rows[0];if(!rate)return null;
  const checkOut=addDays(input.checkIn,input.nights);
  const usage=await sql<Array<{used:number}>>`
    select count(*)::int as used from merchant_inventory_reservations
    where direct_rate_offer_id=${input.offerId}::uuid
      and state in ('RESERVED','PAID','CONFIRMED')
      and check_in < ${checkOut}::date and check_out > ${input.checkIn}::date
  `;
  const available=Math.max(0,rate.inventory_units-Number(usage[0]?.used||0));
  return quoteFromRate(rate,input.checkIn,input.nights,input.occupancy,available);
}

export async function createMerchantOrder(input:{offerId:string;customerEmail:string;checkIn:string;nights:30|60|90;occupancy:1|2;sourcingRequestId?:string}){
  const sql=getDatabase();if(!sql)return null;
  return sql.begin(async tx=>{
    const rows=await tx<MerchantRateRow[]>`
      select r.id::text as offer_id,h.name as hotel_name,h.city,h.country,h.slug,r.min_nights,r.max_nights,r.max_guests,r.monthly_price::float,r.hotel_net_monthly::float,r.currency,r.valid_from::text,r.valid_to::text,r.channel_model,r.merchant_enabled,r.merchant_terms_verified,r.contract_verified,r.publication_state,r.inventory_units,r.reserved_units,r.sold_units
      from direct_rate_offers r join canonical_hotels h on h.id=r.canonical_hotel_id where r.id=${input.offerId}::uuid for update of r
    `;
    const rate=rows[0];if(!rate)return null;
    const checkOut=addDays(input.checkIn,input.nights);
    const usage=await tx<Array<{used:number}>>`
      select count(*)::int as used from merchant_inventory_reservations
      where direct_rate_offer_id=${input.offerId}::uuid
        and state in ('RESERVED','PAID','CONFIRMED')
        and check_in < ${checkOut}::date and check_out > ${input.checkIn}::date
    `;
    const available=Math.max(0,rate.inventory_units-Number(usage[0]?.used||0));
    const quote=quoteFromRate(rate,input.checkIn,input.nights,input.occupancy,available);if(!quote)return null;
    const orders=await tx<Array<{id:string;status:string}>>`
      insert into merchant_orders(direct_rate_offer_id,sourcing_request_id,customer_email,check_in,nights,occupancy,currency,customer_total,hotel_cost,platform_revenue,status)
      values(${input.offerId}::uuid,${input.sourcingRequestId??null}::uuid,${input.customerEmail},${input.checkIn},${input.nights},${input.occupancy},${quote.currency},${quote.customerTotal},${quote.hotelCost},${quote.platformRevenue},'CREATED') returning id::text,status
    `;
    if(!orders[0])return null;
    await tx`
      insert into merchant_inventory_reservations(order_id,direct_rate_offer_id,check_in,check_out,state)
      values(${orders[0].id}::uuid,${input.offerId}::uuid,${input.checkIn}::date,${checkOut}::date,'RESERVED')
    `;
    await tx`update direct_rate_offers set reserved_units=reserved_units+1,updated_at=now() where id=${input.offerId}::uuid`;
    return{...orders[0],quote};
  });
}

export async function attachCheckoutSession(orderId:string,sessionId:string){
  const sql=getDatabase();if(!sql)return false;
  const rows=await sql<Array<{id:string}>>`update merchant_orders set status='CHECKOUT_CREATED',payment_provider='stripe',checkout_session_id=${sessionId},updated_at=now() where id=${orderId}::uuid and status='CREATED' returning id::text`;
  return Boolean(rows[0]);
}

export async function releaseMerchantOrder(orderId:string,status:"PAYMENT_FAILED"|"EXPIRED"|"CANCELLED"){
  const sql=getDatabase();if(!sql)return false;
  return sql.begin(async tx=>{
    const rows=await tx<Array<{id:string;direct_rate_offer_id:string;status:string}>>`select id::text,direct_rate_offer_id::text,status from merchant_orders where id=${orderId}::uuid for update`;
    const order=rows[0];if(!order||!["CREATED","CHECKOUT_CREATED"].includes(order.status))return false;
    await tx`update merchant_orders set status=${status},cancelled_at=now(),updated_at=now() where id=${orderId}::uuid`;
    await tx`update merchant_inventory_reservations set state='RELEASED',updated_at=now() where order_id=${orderId}::uuid and state='RESERVED'`;
    await tx`update direct_rate_offers set reserved_units=greatest(0,reserved_units-1),updated_at=now() where id=${order.direct_rate_offer_id}::uuid`;
    return true;
  });
}

export async function markMerchantOrderPaid(orderId:string,paymentIntentId?:string|null){
  const sql=getDatabase();if(!sql)return false;
  return sql.begin(async tx=>{
    const rows=await tx<Array<{id:string;direct_rate_offer_id:string;status:string}>>`select id::text,direct_rate_offer_id::text,status from merchant_orders where id=${orderId}::uuid for update`;
    const order=rows[0];if(!order)return false;if(["PAID","CONFIRMED"].includes(order.status))return true;if(!["CREATED","CHECKOUT_CREATED"].includes(order.status))return false;
    await tx`update merchant_orders set status='PAID',payment_intent_id=${paymentIntentId??null},paid_at=now(),updated_at=now() where id=${orderId}::uuid`;
    await tx`update merchant_inventory_reservations set state='PAID',updated_at=now() where order_id=${orderId}::uuid and state='RESERVED'`;
    await tx`update direct_rate_offers set reserved_units=greatest(0,reserved_units-1),sold_units=sold_units+1,updated_at=now() where id=${order.direct_rate_offer_id}::uuid`;
    return true;
  });
}

export async function releaseMerchantOrderBySession(sessionId:string,status:"EXPIRED"|"PAYMENT_FAILED"){
  const sql=getDatabase();if(!sql)return false;const rows=await sql<Array<{id:string}>>`select id::text from merchant_orders where checkout_session_id=${sessionId} limit 1`;return rows[0]?releaseMerchantOrder(rows[0].id,status):false;
}

export async function claimMerchantPaymentEvent(eventId:string,eventType:string){
  const sql=getDatabase();if(!sql)return false;
  const rows=await sql<Array<{event_id:string}>>`
    insert into merchant_payment_events(event_id,event_type,processing_state,attempts)
    values(${eventId},${eventType},'PROCESSING',1)
    on conflict(event_id) do update set
      processing_state='PROCESSING',attempts=merchant_payment_events.attempts+1,last_error=null
    where merchant_payment_events.processing_state='FAILED'
    returning event_id
  `;
  return Boolean(rows[0]);
}

export async function finishMerchantPaymentEvent(eventId:string,ok:boolean,error?:string){
  const sql=getDatabase();if(!sql)return false;
  const rows=await sql<Array<{event_id:string}>>`
    update merchant_payment_events set
      processing_state=${ok?'PROCESSED':'FAILED'},
      processed_at=case when ${ok} then now() else processed_at end,
      last_error=${ok?null:(error||'event-not-applied').slice(0,500)}
    where event_id=${eventId} returning event_id
  `;
  return Boolean(rows[0]);
}

export async function merchantOrderBySession(sessionId:string){
  const sql=getDatabase();if(!sql)return null;
  const rows=await sql<Array<{id:string;status:string;check_in:string;nights:number;currency:string;customer_total:number;hotel_name:string;city:string;country:string}>>`
    select o.id::text,o.status,o.check_in::text,o.nights,o.currency,o.customer_total::float,h.name as hotel_name,h.city,h.country from merchant_orders o join direct_rate_offers r on r.id=o.direct_rate_offer_id join canonical_hotels h on h.id=r.canonical_hotel_id where o.checkout_session_id=${sessionId} limit 1
  `;return rows[0]??null;
}

export async function merchantMetrics(days=30){
  const sql=getDatabase();if(!sql)return{configured:false,liveMerchantRates:0,availableUnits:0,orders:0,paidOrders:0,gmv:0,hotelCost:0,platformRevenue:0,takeRate:null as number|null};
  const bounded=Math.max(1,Math.min(365,days));
  const rows=await sql<Array<{live_rates:number;available_units:number;orders:number;paid_orders:number;gmv:number;hotel_cost:number;platform_revenue:number}>>`
    select (select count(*)::int from direct_rate_offers where publication_state='LIVE' and contract_verified=true and merchant_enabled=true and merchant_terms_verified=true and channel_model in ('MERCHANT','EXCLUSIVE_MERCHANT')) as live_rates,
      (select coalesce(sum(greatest(0,inventory_units-reserved_units-sold_units)),0)::int from direct_rate_offers where publication_state='LIVE' and merchant_enabled=true and merchant_terms_verified=true) as available_units,
      count(*)::int as orders,count(*) filter (where status in ('PAID','CONFIRMED'))::int as paid_orders,
      coalesce(sum(customer_total) filter (where status in ('PAID','CONFIRMED')),0)::float as gmv,coalesce(sum(hotel_cost) filter (where status in ('PAID','CONFIRMED')),0)::float as hotel_cost,coalesce(sum(platform_revenue) filter (where status in ('PAID','CONFIRMED')),0)::float as platform_revenue
    from merchant_orders where created_at>=now()-make_interval(days => ${bounded})
  `;
  const r=rows[0]||{live_rates:0,available_units:0,orders:0,paid_orders:0,gmv:0,hotel_cost:0,platform_revenue:0};const gmv=Number(r.gmv||0),platformRevenue=Number(r.platform_revenue||0);
  return{configured:true,liveMerchantRates:Number(r.live_rates||0),availableUnits:Number(r.available_units||0),orders:Number(r.orders||0),paidOrders:Number(r.paid_orders||0),gmv,hotelCost:Number(r.hotel_cost||0),platformRevenue,takeRate:gmv>0?platformRevenue/gmv:null};
}


export async function configureMerchantRate(input:{
  id:string;channelModel:"REFERRAL"|"MERCHANT"|"EXCLUSIVE_MERCHANT";
  hotelNetMonthly?:number;inventoryUnits?:number;merchantTermsVerified?:boolean;
}){
  const sql=getDatabase();if(!sql)return null;
  const merchant=input.channelModel!=="REFERRAL";
  const rows=await sql<Array<{id:string}>>`
    update direct_rate_offers set
      channel_model=${input.channelModel},
      hotel_net_monthly=${merchant?(input.hotelNetMonthly??null):null},
      inventory_units=${merchant?(input.inventoryUnits??0):0},
      reserved_units=case when ${merchant} then reserved_units else 0 end,
      sold_units=case when ${merchant} then sold_units else 0 end,
      merchant_enabled=${merchant},
      merchant_terms_verified=${merchant?Boolean(input.merchantTermsVerified):false},
      publication_state='DRAFT',
      contract_verified=false,
      verified_at=null,
      published_at=null,
      updated_at=now()
    where id=${input.id}::uuid and publication_state in ('DRAFT','READY_FOR_REVIEW','LIVE')
    returning id::text
  `;
  return rows[0]?.id??null;
}
