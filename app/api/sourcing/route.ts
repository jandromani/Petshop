import { createHash } from "node:crypto";
import { boundedJson,sameOrigin } from "@/src/security/public-request";
import { consentedAttribution } from "@/src/growth/attribution";
import { attachVerifiedQuote } from "@/src/db/customer-requests";
import { queueSourcingEmail,drainSourcingEmail } from "@/src/services/sourcing-delivery";
import { cookies } from "next/headers";
import { z } from "zod";
import { after } from "next/server";
import { resolveDirectoryHotel } from "@/src/services/directory";
import { createSourcingRequest,listSourcingRequests,updateSourcingRequestStatus } from "@/src/db/sourcing";
import { ensureHotelLead } from "@/src/db/direct-supply";
import { enforceRateLimit,requestFingerprint } from "@/src/security/rate-limit";
import { opsAuthorized } from "@/src/security/ops-auth";
import { BookingDemandClient } from "@/src/providers/live/booking";
import { runBookingLiveWave } from "@/src/services/booking-live-wave";
import { listSellableOffers } from "@/src/db/catalog";
import { sourcingEmailStatus } from "@/src/services/sourcing-email";
import { ensureSavedProfile,SAVED_PROFILE_COOKIE } from "@/src/db/consumer-memory";

export const runtime="nodejs";

function normName(value:string){
  return value.normalize("NFD").replace(/[\u0300-\u036f]/g,"").toLowerCase().replace(/[^a-z0-9]+/g," ").trim();
}
function closeName(a:string,b:string){
  const x=normName(a),y=normName(b);return x===y||x.includes(y)||y.includes(x);
}

async function tryCommercialSourcing(input:{
  requestId:string;hotel:{id:string;name:string;city:string;country:string;region:"Europe"|"Asia"|"Africa"|"Americas";lat:number|null;lng:number|null};
  checkIn:string;nights:30|60|90;occupancy:1|2;
}){
  if(input.hotel.lat===null||input.hotel.lng===null)return;
  const booking=new BookingDemandClient();const status=booking.status();
  if(!status.commercialReady)return;
  try{
    await runBookingLiveWave({
      waveKey:"customer_"+input.requestId,
      checkIn:input.checkIn,nights:input.nights,adults:input.occupancy,persist:true,
      maxDestinations:1,radiusKm:2,rowsPerDestination:40,
      anchors:[{city:input.hotel.city,country:input.hotel.country,region:input.hotel.region,lat:input.hotel.lat,lng:input.hotel.lng}],
    });
    const offers=await listSellableOffers({q:input.hotel.name,checkIn:input.checkIn,nights:input.nights,occupancy:input.occupancy,limit:12});
    const matched=offers.find(o=>o.country.toLowerCase()===input.hotel.country.toLowerCase()&&closeName(o.name,input.hotel.name));
    if(matched){
      if(await attachVerifiedQuote(input.requestId,matched.offerId)){await queueSourcingEmail(input.requestId,"match");await drainSourcingEmail(5)}
    }
  }catch(error){
    console.warn(JSON.stringify({level:"warning",event:"customer_targeted_sourcing_failed",requestId:input.requestId,error:String(error).slice(0,300)}));
  }
}

const Input=z.object({
  hotelId:z.string().min(4).max(180),
  checkIn:z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  nights:z.union([z.literal(30),z.literal(60),z.literal(90),z.literal(120),z.literal(180),z.literal(365)]),
  occupancy:z.union([z.literal(1),z.literal(2)]),
  targetMonthlyEur:z.number().positive().max(50000).optional(),
  requesterEmail:z.string().trim().toLowerCase().email().max(254),
  contactConsent:z.literal(true),
  sourcePath:z.string().max(300).optional(),
  language:z.enum(["en","es"]).default("en"),
});

export async function POST(req:Request){
  if(!sameOrigin(req))return Response.json({error:"origin"},{status:403});
  const gate=await enforceRateLimit({key:requestFingerprint(req,"source-stay"),limit:8,windowSeconds:3600});
  if(!gate.allowed)return Response.json({error:"rate-limited"},{status:429,headers:{"Cache-Control":"no-store"}});
  const parsed=Input.safeParse(await boundedJson(req));
  if(!parsed.success)return Response.json({error:"invalid-sourcing-request",issues:parsed.error.issues},{status:400});
  const hotel=await resolveDirectoryHotel(parsed.data.hotelId);
  if(!hotel)return Response.json({error:"hotel-not-found"},{status:404});
  const date=new Date(parsed.data.checkIn+"T00:00:00Z");
  if(!Number.isFinite(date.getTime())||date.toISOString().slice(0,10)!==parsed.data.checkIn)return Response.json({error:"invalid-date"},{status:400});
  if(date.getTime()<Date.now()-86400000)return Response.json({error:"check-in-in-past"},{status:400});

  const jar=await cookies();
  const profileId=await ensureSavedProfile(jar.get(SAVED_PROFILE_COOKIE)?.value);
  if(profileId)jar.set(SAVED_PROFILE_COOKIE,profileId,{httpOnly:true,secure:process.env.NODE_ENV==="production",sameSite:"lax",path:"/",maxAge:60*60*24*365});
  const row=await createSourcingRequest({
    directoryHotelId:hotel.id,hotelName:hotel.name,city:hotel.city,country:hotel.country,
    checkIn:parsed.data.checkIn,nights:parsed.data.nights,occupancy:parsed.data.occupancy,
    targetMonthlyEur:parsed.data.targetMonthlyEur,requesterHash:createHash("sha256").update((profileId||requestFingerprint(req,"source-stay-identity"))+":"+parsed.data.requesterEmail).digest("hex"),
    requesterEmail:parsed.data.requesterEmail,contactConsent:true,sourcePath:parsed.data.sourcePath?.split(/[?#]/)[0],consumerProfileId:profileId??undefined,language:parsed.data.language,acquisition:consentedAttribution(jar),
  });
  if(!row)return Response.json({error:"database-unavailable"},{status:503});

  const canonicalHotelId=/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(hotel.canonicalId)?hotel.canonicalId:undefined;
  const leadId=await ensureHotelLead({canonicalHotelId,hotelName:hotel.name,city:hotel.city,country:hotel.country,region:hotel.region,lat:hotel.lat??undefined,lng:hotel.lng??undefined,website:hotel.website??undefined,source:"customer-sourcing",notes:{directoryHotelId:hotel.id,sourcingRequestId:row.id,checkIn:parsed.data.checkIn,nights:parsed.data.nights,occupancy:parsed.data.occupancy,targetMonthlyEur:parsed.data.targetMonthlyEur??null}}).catch(()=>null);
  const active=row.status==="OPEN"?await updateSourcingRequestStatus(row.id,"SOURCING"):row;
  const bookingStatus=new BookingDemandClient().status();

  await queueSourcingEmail(row.id,"receipt");
  after(async()=>{
    await drainSourcingEmail(5);
    if(parsed.data.nights===30||parsed.data.nights===60||parsed.data.nights===90)await tryCommercialSourcing({requestId:row.id,hotel:{id:hotel.id,name:hotel.name,city:hotel.city,country:hotel.country,region:hotel.region,lat:hotel.lat,lng:hotel.lng},checkIn:parsed.data.checkIn,nights:parsed.data.nights,occupancy:parsed.data.occupancy});
  });

  return Response.json({
    ok:true,id:row.id,status:active?.status||"SOURCING",leadId,
    notification:sourcingEmailStatus().configured?"automatic":"ops-queue",
    providerAttempt:bookingStatus.commercialReady&&hotel.lat!==null&&hotel.lng!==null?"booking-targeted-after-response":"direct-hotel-os",
    trackingPath:parsed.data.language==="es"?"/es/requests":"/requests",
    message:"Your stay request has been received."
  },{status:202,headers:{"Cache-Control":"no-store"}});
}

export async function GET(req:Request){
  if(!(await opsAuthorized(req)))return new Response("Unauthorized",{status:401});
  return Response.json({requests:await listSourcingRequests(200),emailDelivery:sourcingEmailStatus()},{headers:{"Cache-Control":"no-store"}});
}

const StatusInput=z.object({id:z.string().uuid(),status:z.enum(["OPEN","SOURCING","MATCHED","CLOSED"]),offerId:z.string().uuid().optional()}).strict();
export async function PATCH(req:Request){
  if(!(await opsAuthorized(req)))return new Response("Unauthorized",{status:401});
  const parsed=StatusInput.safeParse(await boundedJson(req));
  if(!parsed.success)return Response.json({error:"invalid-status-update"},{status:400});
  if(parsed.data.status==="MATCHED"){
    if(!parsed.data.offerId||!await attachVerifiedQuote(parsed.data.id,parsed.data.offerId))return Response.json({error:"verified-matching-offer-required"},{status:409});
    await queueSourcingEmail(parsed.data.id,"match");after(async()=>{await drainSourcingEmail(5)});return Response.json({ok:true});
  }
  const row=await updateSourcingRequestStatus(parsed.data.id,parsed.data.status);
  return row?Response.json({ok:true,request:row}):Response.json({error:"not-found"},{status:404});
}
