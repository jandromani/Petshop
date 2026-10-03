import { z } from "zod";
import { createHotelLead } from "@/src/db/direct-supply";

import { opsAuthorized } from "@/src/security/ops-auth";
const Input=z.object({
  hotelName:z.string().min(2).max(200),
  city:z.string().min(2).max(120),
  country:z.string().min(2).max(120),
  region:z.enum(["Europe","Asia","Africa","Americas"]).optional(),
  lat:z.number().min(-90).max(90).optional(),
  lng:z.number().min(-180).max(180).optional(),
  website:z.string().url().optional(),
  contactName:z.string().max(160).optional(),
  contactRole:z.string().max(160).optional(),
  contactEmail:z.string().email().optional(),
  source:z.string().max(120).optional(),
  notes:z.record(z.string(),z.unknown()).optional(),
});
export async function POST(req:Request){
  if(!(await opsAuthorized(req))) return new Response("Unauthorized",{status:401});
  const parsed=Input.safeParse(await req.json().catch(()=>null));
  if(!parsed.success) return Response.json({error:"invalid-lead",issues:parsed.error.issues},{status:400});
  const id=await createHotelLead(parsed.data);
  if(!id) return Response.json({error:"database-not-configured"},{status:503});
  return Response.json({ok:true,id},{status:201});
}
