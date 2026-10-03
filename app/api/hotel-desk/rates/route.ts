import { z } from "zod";
import { createDirectRate } from "@/src/db/direct-supply";

import { opsAuthorized } from "@/src/security/ops-auth";
const Input=z.object({
  hotelLeadId:z.string().uuid(),
  rateCode:z.string().min(2).max(80),
  minNights:z.number().int().min(30).max(180),
  maxNights:z.number().int().min(30).max(365).optional(),
  board:z.string().max(80).optional(),
  monthlyPrice:z.number().positive(),
  currency:z.string().regex(/^[A-Z]{3}$/),
  validFrom:z.string().optional(),
  validTo:z.string().optional(),
  cancellation:z.string().max(1000).optional(),
  bookingUrl:z.string().url().optional(),
  contractReference:z.string().max(200).optional(),
  contractVerified:z.boolean().optional(),
});
export async function POST(req:Request){
  if(!(await opsAuthorized(req))) return new Response("Unauthorized",{status:401});
  const parsed=Input.safeParse(await req.json().catch(()=>null));
  if(!parsed.success) return Response.json({error:"invalid-rate",issues:parsed.error.issues},{status:400});
  const id=await createDirectRate(parsed.data);
  if(!id) return Response.json({error:"database-not-configured"},{status:503});
  return Response.json({ok:true,id,state:parsed.data.contractVerified&&parsed.data.bookingUrl?"READY_FOR_REVIEW":"DRAFT"},{status:201});
}
