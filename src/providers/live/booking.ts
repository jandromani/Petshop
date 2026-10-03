import { fetchJson, finiteNumber, type LiveProviderStatus, type LiveSearchBase, type LiveSearchHit } from "./common";

type BookingSearchInput = LiveSearchBase & {
  cityId: number;
  bookerCountry?: string;
  platform?: "desktop" | "mobile" | "tablet";
  rooms?: number;
};

type BookingResponse = {
  data?: Array<{
    id?: number | string;
    currency?: string;
    price?: { total?: number; book?: number };
    url?: string;
    deep_link_url?: string;
    products?: unknown;
  }>;
};

export class BookingDemandClient {
  readonly provider = "booking";

  status(): LiveProviderStatus {
    const missingEnv = [
      ["BOOKING_API_KEY", process.env.BOOKING_API_KEY],
      ["BOOKING_AFFILIATE_ID", process.env.BOOKING_AFFILIATE_ID],
    ].filter(([,v])=>!v).map(([k])=>k);

    const base = process.env.BOOKING_API_BASE || "https://demandapi-sandbox.booking.com/3.2";
    return {
      provider:this.provider,
      configured:missingEnv.length===0,
      environment:base.includes("sandbox") ? "sandbox" : "production",
      missingEnv,
      notes:[
        "Demand API /accommodations/search",
        "Bearer token + X-Affiliate-Id",
        "Search response may include attributable web/deep-link URLs",
      ],
    };
  }

  async search(input: BookingSearchInput): Promise<LiveSearchHit[]> {
    const status=this.status();
    if(!status.configured) throw new Error("Booking provider disabled: "+status.missingEnv.join(", "));

    const base=process.env.BOOKING_API_BASE || "https://demandapi-sandbox.booking.com/3.2";
    const body={
      city:input.cityId,
      booker:{country:input.bookerCountry || "es",platform:input.platform || "desktop"},
      checkin:input.checkIn,
      checkout:input.checkOut,
      currency:input.currency || "EUR",
      guests:{number_of_adults:input.adults,number_of_rooms:input.rooms || 1},
      extras:["products","extra_charges"],
    };

    const data=await fetchJson<BookingResponse>(this.provider,`${base}/accommodations/search`,{
      method:"POST",
      headers:{
        Authorization:"Bearer "+process.env.BOOKING_API_KEY,
        "X-Affiliate-Id":String(process.env.BOOKING_AFFILIATE_ID),
        "Content-Type":"application/json",
      },
      body:JSON.stringify(body),
    },{retries:2});

    return (data.data || []).flatMap(row=>{
      if(row.id===undefined) return [];
      return [{
        provider:this.provider,
        providerHotelId:String(row.id),
        totalPrice:finiteNumber(row.price?.total ?? row.price?.book),
        currency:row.currency,
        deepLink:row.url || row.deep_link_url,
        raw:row,
      }];
    });
  }
}
