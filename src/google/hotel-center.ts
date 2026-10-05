import { listSellableOffers,getSellableOfferForReferral } from "@/src/db/catalog";
import { canonicalSiteUrl } from "@/src/system/site-url";

export type HotelCenterCandidate={
  hotelId:string;name:string;city:string;country:string;
  checkIn:string;checkOut:string;nights:number;occupancy:number;
  price:number;currency:string;taxesIncluded:boolean|null|undefined;
  cancellation:string|null|undefined;landingPage:string;verifiedAt:string;expiresAt:string|null;
};

export async function hotelCenterCandidates(){
  const offers=(await listSellableOffers({limit:50})).filter(o=>o.nights>=1&&o.nights<=30);
  const rows=await Promise.all(offers.map(async o=>{
    const referral=await getSellableOfferForReferral(o.offerId);
    if(!referral?.deepLink)return null;
    return{
      hotelId:o.hotelId,name:o.name,city:o.city,country:o.country,checkIn:o.checkIn,checkOut:o.checkOut,
      nights:o.nights,occupancy:o.occupancy,price:o.displayPrice,currency:o.currency,taxesIncluded:o.taxesIncluded,
      cancellation:o.cancellation,landingPage:canonicalSiteUrl()+"/api/referral?offer="+encodeURIComponent(o.offerId)+"&from=%2Fgoogle-hotel-center",
      verifiedAt:o.verifiedAt,expiresAt:o.expiresAt,
    } satisfies HotelCenterCandidate;
  }));
  return rows.filter((x):x is HotelCenterCandidate=>Boolean(x));
}

export async function hotelCenterReadiness(){
  const rows=await hotelCenterCandidates();
  const accountConfigured=Boolean(process.env.GOOGLE_HOTEL_CENTER_ACCOUNT_ID?.trim());
  const customDomain=!canonicalSiteUrl().endsWith(".vercel.app")&&!canonicalSiteUrl().includes("localhost");
  const blockers=[
    ...(!accountConfigured?["GOOGLE_HOTEL_CENTER_ACCOUNT_ID missing"]:[]),
    ...(!customDomain?["custom public domain missing"]:[]),
    ...(rows.length===0?["no Google-eligible live offers (1–30 nights)"]:[]),
    ...(rows.some(x=>x.price<=0||!x.currency)?["invalid price data"]:[]),
    ...(rows.some(x=>!x.landingPage.startsWith("https://"))?["landing page not HTTPS"]:[]),
  ];
  return{ready:blockers.length===0,accountConfigured,customDomain,eligibleOffers:rows.length,blockers};
}

export async function hotelCenterExport(){
  const rows=await hotelCenterCandidates();
  return{
    schemaVersion:"atlas-hotel-center-candidate-v1",
    generatedAt:new Date().toISOString(),
    note:"Staging export. Transmit only after Hotel Center account approval and price-accuracy validation.",
    properties:[...new Map(rows.map(x=>[x.hotelId,{id:x.hotelId,name:x.name,city:x.city,country:x.country}])).values()],
    prices:rows,
  };
}
