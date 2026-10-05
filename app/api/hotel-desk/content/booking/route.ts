import { z } from "zod";
import { BookingDemandClient } from "@/src/providers/live/booking";
import { listProviderHotels,upsertHotelContent } from "@/src/db/supply";
import { stableEvidenceHash } from "@/src/services/evidence";
import { opsAuthorized } from "@/src/security/ops-auth";
import { auditOpsEvent } from "@/src/db/governance";

const Input=z.object({limit:z.number().int().min(1).max(100).default(50)});

export async function POST(req:Request){
  if(!(await opsAuthorized(req)))return new Response("Unauthorized",{status:401});
  const parsed=Input.safeParse(await req.json().catch(()=>({})));if(!parsed.success)return Response.json({error:"invalid-request"},{status:400});
  if(process.env.BOOKING_CONTENT_STORAGE_ALLOWED!=="true")return Response.json({error:"booking-content-storage-not-authorized"},{status:409});
  const client=new BookingDemandClient();const status=client.status();
  if(!status.configured)return Response.json({error:"booking-not-configured",missingEnv:status.missingEnv},{status:409});
  const mappings=await listProviderHotels("booking",parsed.data.limit);
  if(!mappings.length)return Response.json({ok:true,scanned:0,enriched:0,photos:0,facilities:0,displayAllowed:false});
  const details=await client.details(mappings.map(x=>x.provider_hotel_id));
  const byId=new Map(details.map(x=>[x.providerHotelId,x]));
  const displayAllowed=process.env.BOOKING_CONTENT_DISPLAY_ALLOWED==="true"&&Boolean(process.env.BOOKING_CONTENT_LICENSE_REF);
  const ttlDays=Math.max(1,Math.min(90,Number(process.env.BOOKING_CONTENT_TTL_DAYS||7)||7));
  let enriched=0,photos=0,facilities=0;
  for(const mapping of mappings){
    const detail=byId.get(mapping.provider_hotel_id);if(!detail)continue;
    const evidenceHash=stableEvidenceHash(detail.raw);
    await upsertHotelContent({hotelId:mapping.hotel_id,provider:"booking",description:detail.description,photoUrls:detail.photoUrls,facilities:detail.facilities,sourceHash:evidenceHash,displayAllowed,licenseRef:process.env.BOOKING_CONTENT_LICENSE_REF,sourceUrl:detail.webUrl,expiresAt:new Date(Date.now()+ttlDays*86_400_000).toISOString()});
    enriched++;photos+=detail.photoUrls.length;facilities+=detail.facilities.length;
  }
  await auditOpsEvent({actor:"ops",action:"booking-content.backfill",resourceType:"hotel-content",resourceId:"booking",outcome:"COMPLETE"});
  return Response.json({ok:true,scanned:mappings.length,enriched,photos,facilities,displayAllowed,licenseRefConfigured:Boolean(process.env.BOOKING_CONTENT_LICENSE_REF)});
}