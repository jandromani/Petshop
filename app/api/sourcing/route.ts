import { z } from "zod";
import { realHotelById } from "@/src/data/real-hotels";
import { createSourcingRequest,listSourcingRequests,updateSourcingRequestStatus } from "@/src/db/sourcing";
import { enforceRateLimit,requestFingerprint } from "@/src/security/rate-limit";
import { opsAuthorized } from "@/src/security/ops-auth";

export const runtime="nodejs";
const Input=z.object({
  hotelId:z.string().min(4).max(180),
  checkIn:z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  nights:z.union([z.literal(30),z.literal(60),z.literal(90),z.literal(120),z.literal(180),z.literal(365)]),
  occupancy:z.union([z.literal(1),z.literal(2)]),
  targetMonthlyEur:z.number().positive().max(50000).optional(),
  sourcePath:z.string().max(300).optional(),
});

export async function POST(req:Request){
  const gate=await enforceRateLimit({key:requestFingerprint(req,"source-stay"),limit:8,windowSeconds:3600});
  if(!gate.allowed)return Response.json({error:"rate-limited"},{status:429,headers:{"Cache-Control":"no-store"}});
  const parsed=Input.safeParse(await req.json().catch(()=>null));
  if(!parsed.success)return Response.json({error:"invalid-sourcing-request",issues:parsed.error.issues},{status:400});
  const hotel=realHotelById(parsed.data.hotelId);
  if(!hotel)return Response.json({error:"hotel-not-found"},{status:404});
  if(new Date(parsed.data.checkIn+"T00:00:00Z").getTime()<Date.now()-86400000){
    return Response.json({error:"check-in-in-past"},{status:400});
  }
  const row=await createSourcingRequest({
    directoryHotelId:hotel.id,hotelName:hotel.name,city:hotel.city,country:hotel.country,
    checkIn:parsed.data.checkIn,nights:parsed.data.nights,occupancy:parsed.data.occupancy,
    targetMonthlyEur:parsed.data.targetMonthlyEur,
    requesterHash:requestFingerprint(req,"source-stay-identity"),
    sourcePath:parsed.data.sourcePath,
  });
  if(!row)return Response.json({error:"database-unavailable"},{status:503});
  return Response.json({ok:true,id:row.id,status:row.status,message:"Atlas Supply request created."},{status:202,headers:{"Cache-Control":"no-store"}});
}

export async function GET(req:Request){
  if(!(await opsAuthorized(req)))return new Response("Unauthorized",{status:401});
  return Response.json({requests:await listSourcingRequests(200)},{headers:{"Cache-Control":"no-store"}});
}

const StatusInput=z.object({id:z.string().uuid(),status:z.enum(["OPEN","SOURCING","MATCHED","CLOSED"])});
export async function PATCH(req:Request){
  if(!(await opsAuthorized(req)))return new Response("Unauthorized",{status:401});
  const parsed=StatusInput.safeParse(await req.json().catch(()=>null));
  if(!parsed.success)return Response.json({error:"invalid-status-update"},{status:400});
  const row=await updateSourcingRequestStatus(parsed.data.id,parsed.data.status);
  return row?Response.json({ok:true,request:row}):Response.json({error:"not-found"},{status:404});
}
