import { z } from "zod";
import { databaseConfigured } from "@/src/db/client";
import { listSellableOffers } from "@/src/db/catalog";

export const runtime="nodejs";

const Query=z.object({
  limit:z.coerce.number().int().min(1).max(50).optional(),
  q:z.string().max(100).optional(),
  maxMonthly:z.coerce.number().positive().max(100000).optional(),
  checkIn:z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  flexibleDays:z.coerce.number().int().min(0).max(30).optional(),
  nights:z.coerce.number().int().refine(v=>[30,60,90,120,180].includes(v),"unsupported duration").optional(),
  occupancy:z.coerce.number().int().min(1).max(2).optional(),
  region:z.enum(["All","Europe","Asia","Africa","Americas"]).optional(),
});

export async function GET(req:Request){
  if(!databaseConfigured()) return Response.json({configured:false,offers:[]},{headers:{"Cache-Control":"no-store"}});
  const url=new URL(req.url);
  const parsed=Query.safeParse({
    limit:url.searchParams.get("limit")||undefined,
    q:url.searchParams.get("q")||undefined,
    maxMonthly:url.searchParams.get("maxMonthly")||undefined,
    checkIn:url.searchParams.get("checkIn")||undefined,
    flexibleDays:url.searchParams.get("flexibleDays")||undefined,
    nights:url.searchParams.get("nights")||undefined,
    occupancy:url.searchParams.get("occupancy")||undefined,
    region:url.searchParams.get("region")||undefined,
  });
  if(!parsed.success) return Response.json({error:"invalid-query",issues:parsed.error.issues},{status:400});
  const offers=await listSellableOffers(parsed.data);
  return Response.json({configured:true,offers,query:parsed.data,generatedAt:new Date().toISOString()},{headers:{"Cache-Control":"no-store"}});
}
