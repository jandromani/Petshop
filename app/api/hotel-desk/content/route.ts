import { z } from "zod";
import { upsertHotelContent } from "@/src/db/supply";
import { opsAuthorized } from "@/src/security/ops-auth";
import { auditOpsEvent } from "@/src/db/governance";

const HttpsUrl=z.string().url().refine(value=>value.startsWith("https://"),"https required");
const Input=z.object({
  hotelId:z.string().uuid(),
  description:z.string().min(20).max(6000).optional(),
  photoUrls:z.array(HttpsUrl).max(12).default([]),
  facilities:z.array(z.string().min(2).max(100)).max(50).default([]),
  licenseRef:z.string().min(3).max(500),
  sourceUrl:HttpsUrl,
  expiresAt:z.string().datetime().optional(),
});

export async function POST(req:Request){
  if(!(await opsAuthorized(req)))return new Response("Unauthorized",{status:401});
  const parsed=Input.safeParse(await req.json().catch(()=>null));
  if(!parsed.success)return Response.json({error:"invalid-content",issues:parsed.error.issues},{status:400});
  const ok=await upsertHotelContent({
    hotelId:parsed.data.hotelId,
    provider:"direct",
    description:parsed.data.description,
    photoUrls:[...new Set(parsed.data.photoUrls)],
    facilities:[...new Set(parsed.data.facilities.map(x=>x.trim()).filter(Boolean))],
    displayAllowed:true,
    licenseRef:parsed.data.licenseRef,
    sourceUrl:parsed.data.sourceUrl,
    expiresAt:parsed.data.expiresAt,
  });
  if(!ok)return Response.json({error:"database-not-configured"},{status:503});
  await auditOpsEvent({actor:"ops",action:"hotel-content.publish",resourceType:"hotel",resourceId:parsed.data.hotelId,outcome:"PUBLISHED"});
  return Response.json({ok:true,hotelId:parsed.data.hotelId,provider:"direct",displayAllowed:true},{status:201});
}
