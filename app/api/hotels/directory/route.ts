import { matchesDirectorySearch,resolveSearchScope } from "@/src/core/directory-search";
import { z } from "zod";
import { REAL_HOTEL_SNAPSHOT_DATE,REAL_HOTEL_SOURCE_NOTE } from "@/src/data/real-hotels";
import { enrichedCuratedHotels,curatedGeoSourceIds } from "@/src/data/curated-enrichment";
import { overtureHotels } from "@/src/data/overture-hotels";
import { databaseConfigured } from "@/src/db/client";
import { fallbackDirectoryReference,listDirectoryHotels } from "@/src/db/directory";
import { listSellableOffers } from "@/src/db/catalog";
import { enforceRateLimit,requestFingerprint } from "@/src/security/rate-limit";

export const runtime="nodejs";

const Query=z.object({
  q:z.string().max(120).optional(),
  searchScope:z.enum(["auto","destination","hotel"]).default("auto"),
  region:z.enum(["All","Europe","Asia","Africa","Americas"]).default("All"),
  limit:z.coerce.number().int().min(1).max(60).default(24),
  offset:z.coerce.number().int().min(0).max(10000).default(0),
  view:z.enum(["list","map"]).default("list"),
  bbox:z.string().max(120).optional(),
  checkIn:z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  flexibleDays:z.coerce.number().int().min(0).max(30).default(7),
  duration:z.coerce.number().int().min(1).max(365).default(90),
  occupancy:z.coerce.number().int().min(1).max(2).default(1),
  minMonthly:z.coerce.number().positive().max(50000).optional(),
  maxMonthly:z.coerce.number().positive().max(50000).optional(),
  features:z.string().max(240).optional(),
  featuresMode:z.enum(["rank","strict"]).default("rank"),
  verifiedOnly:z.enum(["0","1"]).default("0"),
  board:z.string().max(60).optional(),
  cancellation:z.string().max(80).optional(),
  provider:z.enum(["direct","booking","ratehawk","hbx"]).optional(),
  brand:z.string().max(100).optional(),
  brandedOnly:z.enum(["0","1"]).default("0"),
  category:z.string().max(80).optional(),
  sort:z.enum(["recommended","price","confidence","name"]).default("recommended"),
});

function parseBbox(value?:string){
  if(!value)return null;
  const p=value.split(",").map(Number);
  if(p.length!==4||p.some(x=>!Number.isFinite(x)))return null;
  const[west,south,east,north]=p;
  if(west>=east||south>=north||west<-180||east>180||south<-90||north>90)return null;
  return{west,south,east,north};
}

const norm=(v:string)=>v.normalize("NFD").replace(/[\u0300-\u036f]/g,"").toLowerCase();
const keyOf=(h:{name:string;city:string;country:string})=>[h.name,h.city,h.country].map(norm).join("|");
const contains=(value:string|null|undefined,needle:string|undefined)=>!needle||Boolean(value&&norm(value).includes(norm(needle)));
function inside(h:{lat:number|null;lng:number|null},b:ReturnType<typeof parseBbox>){
  return !b||(h.lat!==null&&h.lng!==null&&h.lng>=b.west&&h.lng<=b.east&&h.lat>=b.south&&h.lat<=b.north);
}
function offerSummary(o:any){
  return o?{
    offerId:o.offerId,provider:o.provider,monthlyEquivalent:o.monthlyEquivalent,displayPrice:o.displayPrice,
    currency:o.currency,board:o.board,cancellation:o.cancellation,verifiedAt:o.verifiedAt,expiresAt:o.expiresAt,checkoutMode:o.checkoutMode,channelModel:o.channelModel,
    photoUrls:o.photoUrls||[],facilities:o.facilities||[]
  }:null;
}

export async function GET(req:Request){
  const gate=await enforceRateLimit({key:requestFingerprint(req,"real-hotel-directory"),limit:180,windowSeconds:60});
  if(!gate.allowed)return Response.json({error:"rate-limited"},{status:429});

  const url=new URL(req.url);
  const parsed=Query.safeParse(Object.fromEntries(url.searchParams.entries()));
  if(!parsed.success)return Response.json({error:"invalid-query",issues:parsed.error.issues},{status:400});

  const q=(parsed.data.q||"").trim().toLowerCase();
  const bounds=parseBbox(parsed.data.bbox);
  const wanted=(parsed.data.features||"").split(",").map(x=>x.trim().toLowerCase()).filter(Boolean).slice(0,8);
  const verifiedOnly=parsed.data.verifiedOnly==="1";
  const brandedOnly=parsed.data.brandedOnly==="1";
  if(parsed.data.bbox&&!bounds)return Response.json({error:"invalid-bbox"},{status:400});
  if(parsed.data.minMonthly&&parsed.data.maxMonthly&&parsed.data.minMonthly>parsed.data.maxMonthly){
    return Response.json({error:"invalid-price-range"},{status:400});
  }

  const curated=enrichedCuratedHotels;
  const overture=overtureHotels
    .filter(h=>!curatedGeoSourceIds.has(h.sourceId))
    .map(h=>({...h,canonicalId:h.id,source:"overture",description:null,photoUrls:[],facilities:[]}));

  let scope=resolveSearchScope(q,parsed.data.searchScope,[...curated,...overture]);
  const staticRows=[...curated,...overture].filter(h=>
    (parsed.data.region==="All"||h.region===parsed.data.region)&&
    inside(h,bounds)
  );

  const curatedOrder=new Map(curated.map((h,i)=>[keyOf(h),i]));
  const compareIdentity=(a:any,b:any)=>{
    const ai=curatedOrder.get(keyOf(a)),bi=curatedOrder.get(keyOf(b));
    if(ai!==undefined||bi!==undefined){
      if(ai!==undefined&&bi!==undefined)return ai-bi;
      return ai!==undefined?-1:1;
    }
    const website=Number(Boolean(b.website))-Number(Boolean(a.website));if(website)return website;
    const confidence=Number(b.confidence||0)-Number(a.confidence||0);if(confidence)return confidence;
    return a.name.localeCompare(b.name)||a.city.localeCompare(b.city);
  };

  let imported:Array<any>=[];
  if(databaseConfigured()){
    const db=await listDirectoryHotels({
      q:parsed.data.q,searchScope:parsed.data.searchScope==="auto"?undefined:scope,region:parsed.data.region,limit:5000,offset:0,maxRows:5000,bbox:bounds,
    }).catch(()=>null);
    imported=(db?.hotels||[]).map(h=>({...h,referenceUrl:h.referenceUrl||fallbackDirectoryReference(h)}));
  }

  const merged=new Map<string,any>();
  for(const h of staticRows)merged.set(keyOf(h),h);
  scope=resolveSearchScope(q,parsed.data.searchScope,[...curated,...overture,...imported]);
  for(const h of imported){
    const previous=merged.get(keyOf(h));
    merged.set(keyOf(h),{...previous,...h,market:h.market||previous?.market,brand:h.brand||previous?.brand});
  }
  const all=[...merged.values()].filter(h=>matchesDirectorySearch(h,q,scope)).sort(compareIdentity);

  let live:Array<any>=[];
  if(databaseConfigured()){
    live=await listSellableOffers({
      q:parsed.data.q,region:parsed.data.region,checkIn:parsed.data.checkIn,flexibleDays:parsed.data.flexibleDays,
      nights:parsed.data.duration,occupancy:parsed.data.occupancy,minMonthly:parsed.data.minMonthly,
      maxMonthly:parsed.data.maxMonthly,board:parsed.data.board,cancellation:parsed.data.cancellation,
      provider:parsed.data.provider,limit:50,
    }).catch(()=>[]);
  }
  const liveById=new Map(live.map(o=>[o.hotelId,o]));
  const liveByKey=new Map(live.map(o=>[keyOf(o),o]));

  const enriched=all.map(h=>{
    const offer=liveById.get(h.canonicalId)||liveByKey.get(keyOf(h));
    const summary=offerSummary(offer);
    const known=[...(h.facilities||[]),...(summary?.facilities||[]),h.description||"",h.category||"",...(h.taxonomy||[])].join(" ").toLowerCase();
    const matched=wanted.filter(x=>known.includes(x));
    const why:string[]=[];
    if(summary)why.push("Verified commercial rate for the requested search");
    if(matched.length)why.push("Confirmed preferences: "+matched.join(", "));
    if(h.brand)why.push("Brand evidence: "+h.brand);
    if(h.website)why.push("Official website available");
    if(h.geoSource==="overture")why.push("Curated identity reconciled to Overture coordinates");
    else if(h.source==="overture")why.push("Mapped real-world property identity");
    return{
      ...h,entityState:"REAL_PROPERTY" as const,
      commercialState:offer?"VERIFIED_RATE" as const:"RATE_PENDING" as const,
      liveOffer:summary,preferenceScore:wanted.length?matched.length/wanted.length:0,
      matchedPreferences:matched,unconfirmedPreferences:wanted.filter(x=>!matched.includes(x)),
      why:why.slice(0,4),
    };
  }).filter(h=>{
    if(parsed.data.featuresMode==="strict"&&wanted.length&&h.matchedPreferences.length!==wanted.length)return false;
    if(verifiedOnly&&!h.liveOffer)return false;
    if(parsed.data.board&&!contains(h.liveOffer?.board,parsed.data.board))return false;
    if(parsed.data.cancellation&&!contains(h.liveOffer?.cancellation,parsed.data.cancellation))return false;
    if(parsed.data.provider&&h.liveOffer?.provider!==parsed.data.provider)return false;
    if(parsed.data.minMonthly&&(!h.liveOffer||h.liveOffer.monthlyEquivalent<parsed.data.minMonthly))return false;
    if(parsed.data.brand&&!contains(h.brand,parsed.data.brand))return false;
    if(brandedOnly&&!h.brand)return false;
    if(parsed.data.category&&!contains(h.category,parsed.data.category))return false;
    return true;
  });

  enriched.sort((a,b)=>{
    if(parsed.data.sort==="price"){
      if(a.liveOffer&&b.liveOffer)return a.liveOffer.monthlyEquivalent-b.liveOffer.monthlyEquivalent;
      if(a.liveOffer)return-1;if(b.liveOffer)return 1;return compareIdentity(a,b);
    }
    if(parsed.data.sort==="confidence"){
      return Number(b.confidence||0)-Number(a.confidence||0)||compareIdentity(a,b);
    }
    if(parsed.data.sort==="name")return a.name.localeCompare(b.name)||a.city.localeCompare(b.city);
    const preference=b.preferenceScore-a.preferenceScore;if(preference)return preference;
    const commercial=Number(b.commercialState==="VERIFIED_RATE")-Number(a.commercialState==="VERIFIED_RATE");if(commercial)return commercial;
    return compareIdentity(a,b);
  });

  const mappedAll=enriched.filter(h=>Number.isFinite(h.lat)&&Number.isFinite(h.lng));
  const mappedRows=mappedAll.slice(0,5000);
  const attribution=[
    mappedRows.some(h=>h.source==="overture"||h.geoSource==="overture")?"Overture Maps Foundation":null,
    mappedRows.some(h=>h.source==="openstreetmap")?"OpenStreetMap contributors":null,
  ].filter(Boolean).join(" · ")||null;

  const facets={
    verified:enriched.filter(h=>h.commercialState==="VERIFIED_RATE").length,
    branded:enriched.filter(h=>Boolean(h.brand)).length,
    officialWebsite:enriched.filter(h=>Boolean(h.website)).length,
    mapped:mappedAll.length,
  };

  const relaxations=enriched.length?[]:[
    bounds?{action:"clear_bbox",label:"Clear map area"}:null,
    verifiedOnly?{action:"show_rate_pending",label:"Include rate-pending hotels"}:null,
    parsed.data.featuresMode==="strict"&&wanted.length?{action:"rank_features",label:"Rank facilities instead of requiring them"}:null,
    parsed.data.brand?{action:"clear_brand",label:"Any brand"}:null,
    parsed.data.region!=="All"?{action:"all_regions",label:"Search all regions"}:null,
    q?{action:"clear_query",label:"Clear destination/name"}:null,
  ].filter(Boolean);

  const rows=parsed.data.view==="map"
    ? mappedRows.map(h=>({
        id:h.id,name:h.name,city:h.city,country:h.country,lat:h.lat,lng:h.lng,
        commercialState:h.commercialState,brand:h.brand||null,
        liveOffer:h.liveOffer?{monthlyEquivalent:h.liveOffer.monthlyEquivalent,currency:h.liveOffer.currency}:null,
      }))
    : enriched.slice(parsed.data.offset,parsed.data.offset+parsed.data.limit);

  return Response.json({
    search:{scope,query:parsed.data.q||""},
    source:imported.length?"merged-directory":overtureHotels.length?"overture-snapshot+curated":"public-entity-seed",
    snapshotDate:REAL_HOTEL_SNAPSHOT_DATE,note:REAL_HOTEL_SOURCE_NOTE,attribution,total:enriched.length,
    mapped:mappedAll.length,facets,relaxations,
    offset:parsed.data.view==="map"?0:parsed.data.offset,
    limit:parsed.data.view==="map"?rows.length:parsed.data.limit,
    hotels:rows,
  },{headers:{"Cache-Control":"public, s-maxage=300, stale-while-revalidate=3600"}});
}
