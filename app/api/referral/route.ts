import { cookies } from "next/headers";
import { after } from "next/server";
import { hotelBySlug } from "@/src/data/hotels";
import { createReferralClick, referralLog } from "@/src/services/referral";
import { persistReferralClick } from "@/src/db/ledger";
import { getSellableOfferForReferral } from "@/src/db/catalog";
import { safeCommercialUrl } from "@/src/core/live-offers";
import { busEvent, publishBusEvent } from "@/src/events/bus";
import { estimateExpectedCommission } from "@/src/db/revenue";

export const runtime = "nodejs";

const UUID=/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

async function liveReferral(url:URL,jar:Awaited<ReturnType<typeof cookies>>){
  const offerId=url.searchParams.get("offer");
  if(!offerId || !UUID.test(offerId)) return null;
  const offer=await getSellableOfferForReferral(offerId);
  if(!offer) return new Response("Offer unavailable",{status:404,headers:{"Cache-Control":"no-store"}});
  const target=safeCommercialUrl(offer.provider,offer.deepLink,offer.approvedHost);
  if(!target) return new Response("Commercial destination blocked",{status:409,headers:{"Cache-Control":"no-store"}});

  const expectedCommission=await estimateExpectedCommission({provider:offer.provider,bookingValue:offer.displayPrice,currency:offer.currency});
  const click=createReferralClick({
    visitorId:jar.get("rv_vid")?.value,
    sessionId:jar.get("rv_sid")?.value,
    hotelSlug:offer.slug,
    canonicalHotelId:offer.hotelId,
    offerSnapshotId:offer.offerKind==="snapshot"?offer.offerId:undefined,
    provider:offer.provider,
    expectedCommission:expectedCommission ?? undefined,
    source:jar.get("rv_src")?.value || jar.get("rv_ref")?.value || "direct",
    campaign:jar.get("rv_campaign")?.value,
    pagePath:url.searchParams.get("from") || undefined,
    position:Number(url.searchParams.get("pos")) || undefined,
  });

  if(offer.provider==="booking") target.searchParams.set("label",click.providerTrackingId);

  console.log(referralLog(click));
  after(async()=>{await Promise.allSettled([persistReferralClick(click),publishBusEvent(busEvent("referral.clicked",click,click.clickId,click.clickId))]);});
  return new Response(null,{
    status:302,
    headers:{Location:target.toString(),"Cache-Control":"no-store","X-Referral-Click":click.clickId},
  });
}

export async function GET(req: Request) {
  if(process.env.REFERRAL_RUNTIME_ENABLED==="false") return new Response("Referral runtime disabled",{status:503,headers:{"Cache-Control":"no-store"}});
  const url=new URL(req.url);
  const jar=await cookies();
  if(url.searchParams.has("offer")){
    const response=await liveReferral(url,jar);
    if(response) return response;
  }

  const slug=url.searchParams.get("hotel") || "";
  const requestedProvider=url.searchParams.get("provider") || "booking";
  const hotel=hotelBySlug(slug);
  if(!hotel) return Response.json({error:"Unknown hotel"},{status:404});
  const provider="booking-demo-search";
  const click=createReferralClick({
    visitorId:jar.get("rv_vid")?.value,
    sessionId:jar.get("rv_sid")?.value,
    hotelSlug:hotel.slug,
    provider,
    source:jar.get("rv_src")?.value || jar.get("rv_ref")?.value || "direct",
    campaign:jar.get("rv_campaign")?.value,
    pagePath:url.searchParams.get("from") || undefined,
    position:Number(url.searchParams.get("pos")) || undefined,
  });
  console.log(referralLog(click));
  after(async()=>{await Promise.allSettled([persistReferralClick(click),publishBusEvent(busEvent("referral.clicked",click,click.clickId,click.clickId))]);});

  const target=new URL("https://www.booking.com/searchresults.html");
  target.searchParams.set("ss",hotel.city+", "+hotel.country);
  target.searchParams.set("label",click.providerTrackingId);
  return new Response(null,{status:302,headers:{Location:target.toString(),"Cache-Control":"no-store","X-Referral-Click":click.clickId}});
}
