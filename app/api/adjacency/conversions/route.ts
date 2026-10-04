import { z } from "zod";
import { persistAdjacencyConversion } from "@/src/db/adjacency";
import { enforceRateLimit,requestFingerprint } from "@/src/security/rate-limit";
import { bearerSecretAuthorized } from "@/src/security/secrets";

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
  const gate=await enforceRateLimit({key:requestFingerprint(req,"adjacency-conversion-ingest"),limit:60,windowSeconds:60});
  if(!gate.allowed)return Response.json({error:"rate-limited"},{status:429});
  if(!bearerSecretAuthorized(req,process.env.CONVERSION_INGEST_SECRET))return new Response("Unauthorized",{status:401});
  const parsed=Input.safeParse(await req.json().catch(()=>null));
  if(!parsed.success)return Response.json({error:"invalid-adjacency-conversion",issues:parsed.error.issues},{status:400});
  const ok=await persistAdjacencyConversion(parsed.data);
  return Response.json({ok},{status:ok?200:503});
}
