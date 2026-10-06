import { z } from "zod";
import { addDays } from "@/src/core/search";
import { fetchJson,type LiveProviderStatus } from "./common";

const date=z.string().regex(/^\d{4}-\d{2}-\d{2}$/).refine(v=>!Number.isNaN(Date.parse(v))&&new Date(v).toISOString().slice(0,10)===v);
export const LiteApiProbeInput=z.object({
  city:z.string().trim().min(2).max(120),countryCode:z.string().regex(/^[A-Z]{2}$/),
  guestNationality:z.string().regex(/^[A-Z]{2}$/),checkIn:date,
  nights:z.union([z.literal(30),z.literal(60),z.literal(90)]),
  adults:z.union([z.literal(1),z.literal(2)]).default(1),currency:z.string().regex(/^[A-Z]{3}$/).default("EUR"),
}).strict();
export type LiteApiProbe= z.infer<typeof LiteApiProbeInput>;
const amount=z.object({amount:z.coerce.number().finite().positive(),currency:z.string().regex(/^[A-Z]{3}$/)});
const response=z.object({data:z.array(z.object({
  hotelId:z.string().min(1),roomTypes:z.array(z.object({
    offerId:z.string().min(1),offerRetailRate:amount.optional(),
    suggestedSellingPrice:amount.optional(),
    rates:z.array(z.object({
      name:z.string().optional(),boardName:z.string().optional(),
      adultCount:z.number().optional(),maxOccupancy:z.number().optional(),
      retailRate:z.object({total:z.array(amount)}),
      cancellationPolicies:z.unknown().optional(),
    })).min(1),
  })),
}))});

export class LiteApiClient {
  status():LiveProviderStatus {
    const configured=Boolean(process.env.LITEAPI_API_KEY);
    const production=process.env.LITEAPI_ENVIRONMENT==="production";
    return {provider:"liteapi",configured,environment:production?"production":"sandbox",
      missingEnv:configured?[]:["LITEAPI_API_KEY"],commercialReady:false,
      blockers:[...(!configured?["LITEAPI_API_KEY missing"]:[]),...(!production?["Sandbox rates are test data"]:[]),"Prebook, hosted payment and booking confirmation are not activated"],
      notes:["Operations-only availability probe. No public rates, inventory, payments or booking writes.","Search uses city/country; no paid Places or price-index calls."]};
  }

  async probe(raw:LiteApiProbe) {
    const input=LiteApiProbeInput.parse(raw);
    if(!this.status().configured)throw new Error("liteapi-not-configured");
    const checkOut=addDays(input.checkIn,input.nights);
    const payload=await fetchJson<unknown>("liteapi","https://api.liteapi.travel/v3.0/hotels/rates",{
      method:"POST",headers:{"X-API-Key":process.env.LITEAPI_API_KEY!,"Content-Type":"application/json"},
      body:JSON.stringify({cityName:input.city,countryCode:input.countryCode,guestNationality:input.guestNationality,
        checkin:input.checkIn,checkout:checkOut,currency:input.currency,occupancies:[{adults:input.adults}],
        limit:10,maxRatesPerHotel:1,timeout:6}),cache:"no-store",
    },{timeoutMs:10000,retries:0});
    // LiteAPI returns HTTP 204 with no body when suppliers have no availability.
    if(payload&&typeof payload==="object"&&!Array.isArray(payload)&&Object.keys(payload).length===0)return this.result(input,checkOut,[]);
    const parsed=response.parse(payload);
    const observations=parsed.data.flatMap(h=>h.roomTypes.flatMap(o=>{
      // One occupancy requested: multi-room or inconsistent responses are quarantined.
      if(o.rates.length!==1)return [];
      const rate=o.rates[0];const total=rate.retailRate.total;
      if(total.length!==1||total[0].currency!==input.currency)return [];
      if(rate.adultCount!==undefined&&rate.adultCount!==input.adults)return [];
      if(rate.maxOccupancy!==undefined&&rate.maxOccupancy<input.adults)return [];
      if(o.offerRetailRate&&(o.offerRetailRate.currency!==input.currency||Math.abs(o.offerRetailRate.amount-total[0].amount)>0.01))return [];
      return [{hotelId:h.hotelId,offerId:o.offerId,totalStayAmount:total[0].amount,currency:total[0].currency,
        suggestedSellingPrice:o.suggestedSellingPrice||null,room:rate.name||null,board:rate.boardName||null,
        cancellation:rate.cancellationPolicies||null}];
    }));
    return this.result(input,checkOut,observations);
  }

  private result(input:LiteApiProbe,checkOut:string,observations:unknown[]) {
    return {provider:"liteapi",environment:this.status().environment,stage:"search",sellable:false,
      requested:{...input,checkOut},observedAt:new Date().toISOString(),count:observations.length,observations,
      note:"Whole-stay supplier observations. Revalidation, distribution rights, taxes, payment and confirmation must pass before publication."};
  }
}
