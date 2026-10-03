import { z } from "zod";
import { persistAdjacencyConversion } from "@/src/db/adjacency";

const Input=z.object({
  clickId:z.string().uuid(),
  kind:z.enum(["flight","insurance","telemedicine","transfer","home-management"]),
  partnerKey:z.string().min(1).max(120),
  providerConversionId:z.string().min(1).max(200),
  bookingValue:z.number().nonnegative().optional(),
  commission:z.number().optional(),
  currency:z.string().regex(/^[A-Z]{3}$/).optional(),
  status:z.enum(["PENDING","CONFIRMED","CANCELLED","SETTLED","REVERSED"]).default("PENDING"),
  rawPayload:z.unknown().optional(),
});

export async function POST(req:Request){
  const secret=process.env.CONVERSION_INGEST_SECRET;
  if(!secret||req.headers.get("authorization")!=="Bearer "+secret)return new Response("Unauthorized",{status:401});
  const parsed=Input.safeParse(await req.json().catch(()=>null));
  if(!parsed.success)return Response.json({error:"invalid-adjacency-conversion",issues:parsed.error.issues},{status:400});
  const ok=await persistAdjacencyConversion(parsed.data);
  return Response.json({ok},{status:ok?200:503});
}
