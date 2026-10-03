import { Buffer } from "node:buffer";
import { daysBetween, fetchJson, finiteNumber, type LiveProviderStatus, type LiveSearchBase, type LiveSearchHit } from "./common";

type RateHawkSearchInput = LiveSearchBase & {
  hotelIds: number[];
  residency?: string;
  children?: number[];
};

type RateHawkResponse = {
  data?: {
    hotels?: Array<{
      id?: string;
      hid?: number;
      rates?: Array<{
        meal?: string;
        payment_options?: {
          payment_types?: Array<{
            show_amount?: string | number;
            show_currency_code?: string;
            amount?: string | number;
            currency_code?: string;
          }>;
        };
      }>;
    }>;
  };
};

export class RateHawkClient {
  readonly provider="ratehawk";

  status():LiveProviderStatus{
    const missingEnv=[
      ["RATEHAWK_KEY_ID",process.env.RATEHAWK_KEY_ID],
      ["RATEHAWK_API_KEY",process.env.RATEHAWK_API_KEY],
    ].filter(([,v])=>!v).map(([k])=>k);
    const base=process.env.RATEHAWK_API_BASE || "https://api-sandbox.ratehawk.com";
    return{
      provider:this.provider,
      configured:missingEnv.length===0,
      environment:base.includes("sandbox")?"sandbox":"production",
      missingEnv,
      notes:[
        "ETG API v3 search/serp/hotels",
        "Basic auth KEY_ID:API_KEY",
        "SERP rates are discovery rates; selected hotel should be rechecked through hotelpage/prebook",
        "Search checkout is limited to 30 days after check-in; longer stays require continuity probes",
      ],
    };
  }

  async searchHotels(input:RateHawkSearchInput):Promise<LiveSearchHit[]>{
    const status=this.status();
    if(!status.configured) throw new Error("RateHawk provider disabled: "+status.missingEnv.join(", "));
    if(daysBetween(input.checkIn,input.checkOut)>30) throw new Error("RateHawk SERP segment exceeds documented 30-day search limit");
    if(input.hotelIds.length===0 || input.hotelIds.length>300) throw new Error("RateHawk hotelIds must contain 1..300 IDs");

    const base=process.env.RATEHAWK_API_BASE || "https://api-sandbox.ratehawk.com";
    const auth=Buffer.from(`${process.env.RATEHAWK_KEY_ID}:${process.env.RATEHAWK_API_KEY}`).toString("base64");

    const data=await fetchJson<RateHawkResponse>(this.provider,`${base}/api/b2b/v3/search/serp/hotels/`,{
      method:"POST",
      headers:{Authorization:"Basic "+auth,"Content-Type":"application/json"},
      body:JSON.stringify({
        checkin:input.checkIn,
        checkout:input.checkOut,
        residency:input.residency || "es",
        language:"en",
        guests:[{adults:input.adults,children:input.children || []}],
        hids:input.hotelIds,
        currency:input.currency || "EUR",
      }),
    },{retries:2});

    return (data.data?.hotels || []).map(h=>{
      const rate=h.rates?.[0];
      const payment=rate?.payment_options?.payment_types?.[0];
      return{
        provider:this.provider,
        providerHotelId:String(h.hid ?? h.id ?? ""),
        totalPrice:finiteNumber(payment?.show_amount ?? payment?.amount),
        currency:payment?.show_currency_code || payment?.currency_code,
        board:rate?.meal,
        raw:h,
      };
    }).filter(x=>x.providerHotelId);
  }
}
