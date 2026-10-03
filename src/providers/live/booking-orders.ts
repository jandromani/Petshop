import { fetchJson,type LiveProviderStatus } from "@/src/providers/live/common";

export type BookingOrderReportInput={updatedFrom:string;updatedTo:string;currency?:string;maximumResults?:number;page?:string};

type BookingOrdersResponse={data?:unknown[];metadata?:{next_page?:string;next_page_token?:string}};
type BookingAccommodationOrdersResponse={data?:unknown[]};

export class BookingOrdersClient{
  readonly provider="booking";
  status():LiveProviderStatus{
    const missingEnv=["BOOKING_API_KEY","BOOKING_AFFILIATE_ID"].filter(key=>!process.env[key]);
    const base=process.env.BOOKING_API_BASE||"https://demandapi-sandbox.booking.com/3.2";
    return{provider:this.provider,configured:missingEnv.length===0,environment:base.includes("sandbox")?"sandbox":"production",missingEnv,notes:["Orders sync uses rolling updated windows and partner labels for attribution."]};
  }
  private base(){return process.env.BOOKING_API_BASE||"https://demandapi-sandbox.booking.com/3.2";}
  private headers(){return{Authorization:"Bearer "+process.env.BOOKING_API_KEY,"X-Affiliate-Id":String(process.env.BOOKING_AFFILIATE_ID),"Content-Type":"application/json"};}
  private assertConfigured(){const s=this.status();if(!s.configured)throw new Error("Booking provider disabled: "+s.missingEnv.join(", "));}

  async listOrders(input:BookingOrderReportInput){
    this.assertConfigured();
    const body:Record<string,unknown>={
      updated:{from:input.updatedFrom,to:input.updatedTo},
      currency:input.currency||"EUR",
      maximum_results:Math.max(1,Math.min(100,input.maximumResults||100)),
      sort:{by:"updated",direction:"ascending"},
    };
    if(input.page)body.page=input.page;
    return fetchJson<BookingOrdersResponse>(this.provider,this.base()+"/orders/details",{method:"POST",headers:this.headers(),body:JSON.stringify(body)},{retries:2});
  }

  async accommodationDetails(orderIds:string[],currency="EUR"){
    this.assertConfigured();
    if(!orderIds.length)return{data:[]} as BookingAccommodationOrdersResponse;
    return fetchJson<BookingAccommodationOrdersResponse>(this.provider,this.base()+"/orders/details/accommodations",{
      method:"POST",headers:this.headers(),body:JSON.stringify({currency,orders:orderIds.slice(0,100)}),
    },{retries:2});
  }
}
