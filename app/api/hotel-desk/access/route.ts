import { z } from "zod";
import { opsAuthorized } from "@/src/security/ops-auth";
import { issueHotelAccess,revokeHotelAccess } from "@/src/db/hotel-portal";
import { boundedJson } from "@/src/core/hotel-partner";
import { auditOpsEvent } from "@/src/db/governance";

export async function POST(req:Request) {
  if(!await opsAuthorized(req))return new Response("Unauthorized",{status:401});
  const parsed=z.object({hotelLeadId:z.string().uuid(),contactVerified:z.literal(true)}).strict().safeParse(await boundedJson(req));
  if(!parsed.success)return Response.json({error:"verified-contact-required"},{status:400});
  const access=await issueHotelAccess(parsed.data.hotelLeadId);
  if(!access)return Response.json({error:"lead-not-found-or-database-offline"},{status:404});
  await auditOpsEvent({actor:"ops",action:"hotel-access.issue",resourceType:"hotel-lead",resourceId:parsed.data.hotelLeadId,outcome:"7_DAY_ACCESS"});
  return Response.json(access,{status:201,headers:{"Cache-Control":"private, no-store"}});
}

export async function DELETE(req:Request) {
  if(!await opsAuthorized(req))return new Response("Unauthorized",{status:401});
  const parsed=z.object({id:z.string().uuid()}).strict().safeParse(await boundedJson(req));
  if(!parsed.success)return Response.json({error:"invalid-access"},{status:400});
  const revoked=await revokeHotelAccess(parsed.data.id);
  await auditOpsEvent({actor:"ops",action:"hotel-access.revoke",resourceType:"hotel-access",resourceId:parsed.data.id,outcome:revoked?"REVOKED":"NOT_FOUND"});
  return Response.json({revoked},{status:revoked?200:404});
}
