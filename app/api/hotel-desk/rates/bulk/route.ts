import { z } from "zod";
import { createDirectRate,ensureHotelLead } from "@/src/db/direct-supply";
import { opsAuthorized } from "@/src/security/ops-auth";
import { auditOpsEvent } from "@/src/db/governance";

const Row=z.object({
  hotelName:z.string().min(2).max(240),city:z.string().min(2).max(160),country:z.string().min(2).max(160),region:z.string().max(80).optional(),
  lat:z.number().min(-90).max(90).optional(),lng:z.number().min(-180).max(180).optional(),website:z.string().url().startsWith("https://").optional(),
  contactName:z.string().max(160).optional(),contactRole:z.string().max(160).optional(),contactEmail:z.string().email().max(240).optional(),
  rateCode:z.string().min(2).max(80),minNights:z.number().int().min(30).max(365),maxNights:z.number().int().min(30).max(365).optional(),maxGuests:z.number().int().min(1).max(2).default(2),
  board:z.string().max(80).optional(),monthlyPrice:z.number().positive().max(100000),currency:z.string().regex(/^[A-Z]{3}$/),
  validFrom:z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),validTo:z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),cancellation:z.string().max(1000).optional(),
}).refine(x=>x.maxNights===undefined||x.maxNights>=x.minNights,{message:"maxNights below minNights"}).refine(x=>!x.validFrom||!x.validTo||x.validFrom<=x.validTo,{message:"invalid validity window"});
const Input=z.object({source:z.string().min(2).max(100).default("contract-bulk"),rows:z.array(Row).min(1).max(50)});

export async function POST(req:Request){
  if(!(await opsAuthorized(req)))return new Response("Unauthorized",{status:401});
  const parsed=Input.safeParse(await req.json().catch(()=>null));if(!parsed.success)return Response.json({error:"invalid-bulk-rates",issues:parsed.error.issues},{status:400});
  const results=[] as Array<{hotelName:string;leadId:string|null;rateId:string|null}>;
  for(const row of parsed.data.rows){
    const leadId=await ensureHotelLead({hotelName:row.hotelName,city:row.city,country:row.country,region:row.region,lat:row.lat,lng:row.lng,website:row.website,contactName:row.contactName,contactRole:row.contactRole,contactEmail:row.contactEmail,source:parsed.data.source,notes:{bulkIntake:true}});
    const rateId=leadId?await createDirectRate({hotelLeadId:leadId,rateCode:row.rateCode,minNights:row.minNights,maxNights:row.maxNights,maxGuests:row.maxGuests,board:row.board,monthlyPrice:row.monthlyPrice,currency:row.currency,validFrom:row.validFrom,validTo:row.validTo,cancellation:row.cancellation}):null;
    results.push({hotelName:row.hotelName,leadId,rateId});
  }
  const created=results.filter(x=>x.rateId).length;
  await auditOpsEvent({actor:"ops",action:"direct-rate.bulk-intake",resourceType:"direct-rate",resourceId:parsed.data.source,outcome:created===parsed.data.rows.length?"COMPLETE":"PARTIAL"});
  return Response.json({ok:created>0,received:parsed.data.rows.length,created,state:"DRAFT",results},{status:created?201:503});
}