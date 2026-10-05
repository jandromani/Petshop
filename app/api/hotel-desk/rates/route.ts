import { z } from "zod";
import { createDirectRate } from "@/src/db/direct-supply";
import { opsAuthorized } from "@/src/security/ops-auth";

const Input=z.object({
  hotelLeadId:z.string().uuid(),
  rateCode:z.string().min(2).max(80),
  minNights:z.number().int().min(30).max(365),
  maxNights:z.number().int().min(30).max(365).optional(),
  maxGuests:z.number().int().min(1).max(2).default(2),
  board:z.string().max(80).optional(),
  monthlyPrice:z.number().positive().max(100000),
  currency:z.string().regex(/^[A-Z]{3}$/),
  validFrom:z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  validTo:z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  cancellation:z.string().max(1000).optional(),
});

export async function POST(req:Request){
  if(!(await opsAuthorized(req))) return new Response("Unauthorized",{status:401});
  const parsed=Input.safeParse(await req.json().catch(()=>null));
  if(!parsed.success) return Response.json({error:"invalid-rate",issues:parsed.error.issues},{status:400});
  if(parsed.data.maxNights!==undefined&&parsed.data.maxNights<parsed.data.minNights){
    return Response.json({error:"max-nights-below-min"},{status:400});
  }
  if(parsed.data.validFrom&&parsed.data.validTo&&parsed.data.validFrom>parsed.data.validTo){
    return Response.json({error:"invalid-validity-window"},{status:400});
  }
  const id=await createDirectRate(parsed.data);
  if(!id) return Response.json({error:"database-not-configured"},{status:503});
  return Response.json({ok:true,id,state:"DRAFT"},{status:201});
}
