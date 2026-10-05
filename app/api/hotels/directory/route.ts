import { z } from "zod";
import { REAL_HOTEL_SNAPSHOT_DATE,REAL_HOTEL_SOURCE_NOTE,realHotelReferenceUrl,realHotels } from "@/src/data/real-hotels";
import { overtureHotels } from "@/src/data/overture-hotels";
import { databaseConfigured } from "@/src/db/client";
import { fallbackDirectoryReference,listDirectoryHotels } from "@/src/db/directory";
import { listSellableOffers } from "@/src/db/catalog";
import { enforceRateLimit,requestFingerprint } from "@/src/security/rate-limit";

export const runtime="nodejs";
const Query=z.object({
  q:z.string().max(120).optional(),
  region:z.enum(["All","Europe","Asia","Africa","Americas"]).default("All"),
  limit:z.coerce.number().int().min(1).max(60).default(24),
  offset:z.coerce.number().int().min(0).max(10000).default(0),
  view:z.enum(["list","map"]).default("list"),
  bbox:z.string().max(120).optional(),
  checkIn:z.string().regex(/^\\d{4}-\\d{2}-\\d{2}$/).optional(),
  flexibleDays:z.coerce.number().int().min(0).max(30).default(7),
  duration:z.coerce.number().int().min(1).max(365).default(90),
  occupancy:z.coerce.number().int().min(1).max(2).default(1),
  maxMonthly:z.coerce.number().positive().max(50000).optional(),
  features:z.string().max(240).optional(),
});

function parseBbox(value?:string){
  if(!value)return null;const p=value.split(",").map(Number);if(p.length!==4||p.some(x=>!Number.isFinite(x)))return null;
  const[west,south,east,north]=p;if(west>=east||south>=north||west<-180||east>180||south<-90||north>90)return null;
  return{west,south,east,north};
}
const norm=(v:string)=>v.normalize("NFD").replace(/[\\u0300-\\u036f]/g,"").toLowerCase();
const keyOf=(h:{name:string;city:string;country:string})=>[h.name,h.city,h.country].map(norm).join("|");
function inside(h:{lat:number|null;lng:number|null},b:ReturnType<typeof parseBbox>){return !b||(h.lat!==null&&h.lng!==null&&h.lng>=b.west&&h.lng<=b.east&&h.lat>=b.south&&h.lat<=b.north);}
function matches(h:{name:string;city:string;country:string;address?:string|null;market?:string|null},q:string){return !q||[h.name,h.city,h.market||"",h.country,h.address||""].join(" ").toLowerCase().includes(q);}
function offerSummary(o:any){return o?{offerId:o.offerId,provider:o.provider,monthlyEquivalent:o.monthlyEquivalent,displayPrice:o.displayPrice,currency:o.currency,board:o.board,cancellation:o.cancellation,verifiedAt:o.verifiedAt,expiresAt:o.expiresAt,photoUrls:o.photoUrls||[],facilities:o.facilities||[]}:null;}

export async function GET(req:Request){
  const gate=await enforceRateLimit({key:requestFingerprint(req,"real-hotel-directory"),limit:180,windowSeconds:60});if(!gate.allowed)return Response.json({error:"rate-limited"},{status:429});
  const url=new URL(req.url);const parsed=Query.safeParse(Object.fromEntries(url.searchParams.entries()));
  if(!parsed.success)return Response.json({error:"invalid-query",issues:parsed.error.issues},{status:400});
  const q=(parsed.data.q||"").trim().toLowerCase(),bounds=parseBbox(parsed.data.bbox);
  const wanted=(parsed.data.features||"").split(",").map(x=>x.trim().toLowerCase()).filter(Boolean).slice(0,8);
  if(parsed.data.bbox&&!bounds)return Response.json({error:"invalid-bbox"},{status:400});

  const curated=realHotels.map(h=>({...h,canonicalId:h.id,lat:null,lng:null,source:"curated_seed",sourceId:h.id,website:null,address:null,confidence:null,description:null,photoUrls:[],facilities:[],referenceUrl:realHotelReferenceUrl(h)}));
  const overture=overtureHotels.map(h=>({...h,canonicalId:h.id,source:"overture",description:null,photoUrls:[],facilities:[]}));
  const staticRows=[...curated,...overture].filter(h=>(parsed.data.region==="All"||h.region===parsed.data.region)&&matches(h,q)&&inside(h,bounds));

  let imported:Array<any>=[];
  if(databaseConfigured()){
    const db=await listDirectoryHotels({q:parsed.data.q,region:parsed.data.region,limit:5000,offset:0,maxRows:5000,bbox:bounds}).catch(()=>null);
    imported=(db?.hotels||[]).map(h=>({...h,referenceUrl:h.referenceUrl||fallbackDirectoryReference(h)}));
  }

  const merged=new Map<string,any>();for(const h of staticRows)merged.set(keyOf(h),h);for(const h of imported)merged.set(keyOf(h),h);
  const all=[...merged.values()].sort((a,b)=>(b.confidence||0)-(a.confidence||0)||a.name.localeCompare(b.name)||a.city.localeCompare(b.city));

  let live:Array<any>=[];
  if(parsed.data.view==="list"&&databaseConfigured()){
    live=await listSellableOffers({q:parsed.data.q,region:parsed.data.region,checkIn:parsed.data.checkIn,flexibleDays:parsed.data.flexibleDays,nights:parsed.data.duration,occupancy:parsed.data.occupancy,maxMonthly:parsed.data.maxMonthly,limit:50}).catch(()=>[]);
  }
  const liveById=new Map(live.map(o=>[o.hotelId,o]));const liveByKey=new Map(live.map(o=>[keyOf(o),o]));
  const enriched=all.map(h=>{const offer=liveById.get(h.canonicalId)||liveByKey.get(keyOf(h));const summary=offerSummary(offer);const known=[...(h.facilities||[]),...(summary?.facilities||[]),h.description||""].join(" ").toLowerCase();const matched=wanted.filter(x=>known.includes(x));return{...h,entityState:"REAL_PROPERTY" as const,commercialState:offer?"VERIFIED_RATE" as const:"RATE_PENDING" as const,liveOffer:summary,preferenceScore:wanted.length?matched.length/wanted.length:0,matchedPreferences:matched};}).sort((a,b)=>b.preferenceScore-a.preferenceScore+(a.preferenceScore===b.preferenceScore?((b.commercialState==="VERIFIED_RATE"?1:0)-(a.commercialState==="VERIFIED_RATE"?1:0)):0));

  const rows=parsed.data.view==="map"?enriched.filter(h=>Number.isFinite(h.lat)&&Number.isFinite(h.lng)).slice(0,5000):enriched.slice(parsed.data.offset,parsed.data.offset+parsed.data.limit);
  const attribution=[
    rows.some(h=>h.source==="overture")?"Overture Maps Foundation":null,
    rows.some(h=>h.source==="openstreetmap")?"OpenStreetMap contributors":null,
  ].filter(Boolean).join(" · ")||null;

  return Response.json({
    source:imported.length?"merged-directory":overtureHotels.length?"overture-snapshot+curated":"public-entity-seed",
    snapshotDate:REAL_HOTEL_SNAPSHOT_DATE,note:REAL_HOTEL_SOURCE_NOTE,attribution,total:enriched.length,
    mapped:enriched.filter(h=>Number.isFinite(h.lat)&&Number.isFinite(h.lng)).length,
    offset:parsed.data.view==="map"?0:parsed.data.offset,limit:parsed.data.view==="map"?rows.length:parsed.data.limit,
    hotels:rows,
  },{headers:{"Cache-Control":"public, s-maxage=300, stale-while-revalidate=3600"}});
}