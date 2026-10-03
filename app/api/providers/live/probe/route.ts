import { z } from "zod";
import { liveProviderRegistry } from "@/src/providers/live/registry";

import { opsAuthorized } from "@/src/security/ops-auth";
export const runtime="nodejs";

const Input=z.discriminatedUnion("provider",[
  z.object({provider:z.literal("booking"),cityId:z.number().int(),checkIn:z.string(),checkOut:z.string(),adults:z.number().int().min(1).max(8),currency:z.string().default("EUR")}),
  z.object({provider:z.literal("ratehawk"),hotelIds:z.array(z.number().int()).min(1).max(300),checkIn:z.string(),checkOut:z.string(),adults:z.number().int().min(1).max(8),currency:z.string().default("EUR")}),
  z.object({provider:z.literal("hbx"),hotelCodes:z.array(z.number().int()).min(1).max(500),checkIn:z.string(),checkOut:z.string(),adults:z.number().int().min(1).max(8),currency:z.string().default("EUR")}),
]);


export async function POST(req:Request){
  if(!(await opsAuthorized(req))) return new Response("Unauthorized",{status:401});
  const parsed=Input.safeParse(await req.json().catch(()=>null));
  if(!parsed.success) return Response.json({error:"Invalid probe request",issues:parsed.error.issues},{status:400});

  const registry=liveProviderRegistry();
  try{
    let hits;
    if(parsed.data.provider==="booking") hits=await registry.booking.search(parsed.data);
    else if(parsed.data.provider==="ratehawk") hits=await registry.ratehawk.searchHotels(parsed.data);
    else hits=await registry.hbx.searchHotels(parsed.data);

    return Response.json({provider:parsed.data.provider,count:hits.length,hits},{headers:{"Cache-Control":"no-store"}});
  }catch(error){
    console.error(JSON.stringify({level:"error",event:"live_provider_probe_failed",provider:parsed.data.provider,error:String(error)}));
    return Response.json({error:String(error)},{status:503,headers:{"Cache-Control":"no-store"}});
  }
}
