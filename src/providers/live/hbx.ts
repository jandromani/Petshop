import { createHash } from "node:crypto";
import { fetchJson, finiteNumber, type LiveProviderStatus, type LiveSearchBase, type LiveSearchHit } from "./common";

type HbxSearchInput = LiveSearchBase & {
  hotelCodes:number[];
  rooms?:number;
  children?:number;
};

type HbxResponse={
  hotels?:{
    hotels?:Array<{
      code?:number;
      rooms?:Array<{
        rates?:Array<{
          net?:number|string;
          sellingRate?:number|string;
          boardCode?:string;
          rateKey?:string;
          rateType?:string;
        }>;
      }>;
    }>;
  };
};

export function hbxSignature(apiKey:string,secret:string,epochSeconds:number){
  return createHash("sha256").update(apiKey+secret+String(epochSeconds)).digest("hex");
}

export class HbxClient{
  readonly provider="hbx";

  status():LiveProviderStatus{
    const missingEnv=[
      ["HBX_API_KEY",process.env.HBX_API_KEY],
      ["HBX_SECRET",process.env.HBX_SECRET],
    ].filter(([,v])=>!v).map(([k])=>k);
    const base=process.env.HBX_API_BASE || "https://api.test.hotelbeds.com";
    return{
      provider:this.provider,
      configured:missingEnv.length===0,
      environment:base.includes("test")?"sandbox":"production",
      missingEnv,
      notes:[
        "Hotel Booking API /hotel-api/1.0/hotels",
        "Api-key + SHA256 X-Signature",
        "Production booking operations require HBX mTLS; availability/search architecture must account for certificate deployment",
      ],
    };
  }

  async searchHotels(input:HbxSearchInput):Promise<LiveSearchHit[]>{
    const status=this.status();
    if(!status.configured) throw new Error("HBX provider disabled: "+status.missingEnv.join(", "));
    if(input.hotelCodes.length===0) throw new Error("HBX hotelCodes cannot be empty");

    const apiKey=String(process.env.HBX_API_KEY);
    const secret=String(process.env.HBX_SECRET);
    const signature=hbxSignature(apiKey,secret,Math.floor(Date.now()/1000));
    const base=process.env.HBX_API_BASE || "https://api.test.hotelbeds.com";

    const data=await fetchJson<HbxResponse>(this.provider,`${base}/hotel-api/1.0/hotels`,{
      method:"POST",
      headers:{
        "Api-key":apiKey,
        "X-Signature":signature,
        Accept:"application/json",
        "Content-Type":"application/json",
      },
      body:JSON.stringify({
        stay:{checkIn:input.checkIn,checkOut:input.checkOut},
        occupancies:[{rooms:input.rooms || 1,adults:input.adults,children:input.children || 0}],
        hotels:{hotel:input.hotelCodes},
      }),
    },{retries:2});

    return (data.hotels?.hotels || []).map(h=>{
      const rate=h.rooms?.[0]?.rates?.[0];
      return{
        provider:this.provider,
        providerHotelId:String(h.code ?? ""),
        totalPrice:finiteNumber(rate?.sellingRate ?? rate?.net),
        currency:input.currency || "EUR",
        board:rate?.boardCode,
        raw:h,
      };
    }).filter(x=>x.providerHotelId);
  }
}
