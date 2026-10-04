import { z } from "zod";
import { databaseConfigured } from "@/src/db/client";
import { persistConversion } from "@/src/db/ledger";
import { after } from "next/server";
import { busEvent,publishBusEvent } from "@/src/events/bus";
import { findReferralByTrackingId } from "@/src/db/revenue";
import { enforceRateLimit,requestFingerprint } from "@/src/security/rate-limit";

export const runtime="nodejs";

const Status=z.enum(["PENDING","CONFIRMED","CANCELLED","SETTLED","REVERSED"]);
const Input=z.object({
  clickId:z.string().uuid().optional(),
  providerTrackingId:z.string().min(8).max(120).optional(),
  provider:z.enum(["booking","ratehawk","hbx","direct"]),
  providerConversionId:z.string().min(1).max(200),
  bookingValue:z.number().nonnegative().optional(),
  commission:z.number().optional(),
  currency:z.string().regex(/^[A-Z]{3}$/).optional(),
  status:Status.default("PENDING"),
  occurredAt:z.string().datetime().optional(),
  settlementReference:z.string().max(200).optional(),
  rawPayload:z.unknown().optional(),
}).refine(v=>Boolean(v.clickId||v.providerTrackingId),{message:"clickId or providerTrackingId is required"});

function authorized(req:Request){
  const secret=process.env.CONVERSION_INGEST_SECRET||process.env.OPS_ACCESS_KEY;
  return Boolean(secret&&req.headers.get("authorization")==="Bearer "+secret);
}

export async function POST(req:Request){
  const gate=await enforceRateLimit({key:requestFingerprint(req,"conversion-ingest"),limit:60,windowSeconds:60});
  if(!gate.allowed)return Response.json({error:"rate-limited"},{status:429});
  if(!authorized(req))return new Response("Unauthorized",{status:401});
  if(!databaseConfigured())return Response.json({error:"database-not-configured"},{status:503});
  const parsed=Input.safeParse(await req.json().catch(()=>null));
  if(!parsed.success)return Response.json({error:"invalid-conversion",issues:parsed.error.issues},{status:400});
  let clickId=parsed.data.clickId;
  if(!clickId&&parsed.data.providerTrackingId){
    const referral=await findReferralByTrackingId(parsed.data.providerTrackingId);
    clickId=referral?.click_id;
  }
  if(!clickId)return Response.json({error:"referral-not-found"},{status:404});
  const conversion={...parsed.data,clickId};
  const result=await persistConversion(conversion);
  if(!result.persisted)return Response.json({error:result.reason},{status:503});
  console.log(JSON.stringify({level:"info",event:"conversion_ingested",provider:parsed.data.provider,clickId,providerConversionId:parsed.data.providerConversionId,status:parsed.data.status}));
  after(async()=>{await publishBusEvent(busEvent("conversion.received",conversion,clickId,parsed.data.provider+"-"+parsed.data.providerConversionId));});
  return Response.json({ok:true,status:parsed.data.status});
}
