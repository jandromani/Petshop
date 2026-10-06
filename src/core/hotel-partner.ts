import { z } from "zod";

const date=z.string().regex(/^\d{4}-\d{2}-\d{2}$/).refine(v=>!Number.isNaN(Date.parse(v))&&new Date(v).toISOString().slice(0,10)===v);
export const HotelApplicationInput=z.object({
  hotelName:z.string().trim().min(2).max(200),city:z.string().trim().min(2).max(120),country:z.string().trim().min(2).max(120),
  website:z.string().url().max(500).refine(v=>new URL(v).protocol==="https:"&&!new URL(v).username&&!new URL(v).password),
  contactName:z.string().trim().min(2).max(160),contactRole:z.string().trim().min(2).max(160),contactEmail:z.string().email().max(254),
  contactConsent:z.literal(true),company:z.string().max(100).default(""),
}).strict();

export const PartnerRateInput=z.object({
  minNights:z.union([z.literal(30),z.literal(60),z.literal(90)]),
  maxNights:z.union([z.literal(30),z.literal(60),z.literal(90)]),
  maxGuests:z.union([z.literal(1),z.literal(2)]),board:z.string().trim().min(2).max(80),
  monthlyPrice:z.number().finite().positive().max(100000),currency:z.string().regex(/^[A-Z]{3}$/),
  validFrom:date,validTo:date,cancellation:z.string().trim().min(5).max(1000),
}).strict().refine(v=>v.maxNights>=v.minNights,{message:"Maximum stay must cover minimum stay"})
  .refine(v=>v.validTo>=v.validFrom,{message:"Invalid validity window"})
  .refine(v=>(Date.parse(v.validTo)-Date.parse(v.validFrom))/86400000+1>=v.minNights,{message:"Validity must cover the minimum stay"});

export function sameOrigin(req:Request) {
  try{return Boolean(req.headers.get("origin"))&&new URL(req.headers.get("origin")!).origin===new URL(req.url).origin;}
  catch{return false;}
}

export async function boundedJson(req:Request) {
  // Bound the stream as well as Content-Length; chunked requests cannot bypass it.
  const reader=req.body?.getReader();if(!reader)return null;
  const chunks:Uint8Array[]=[];let size=0;
  try{for(;;){const {done,value}=await reader.read();if(done)break;size+=value.length;if(size>8192){await reader.cancel();return null;}chunks.push(value);}
    const bytes=new Uint8Array(size);let offset=0;for(const chunk of chunks){bytes.set(chunk,offset);offset+=chunk.length;}
    return JSON.parse(new TextDecoder().decode(bytes));
  }catch{return null;}finally{reader.releaseLock();}
}
