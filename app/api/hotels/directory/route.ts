import { z } from "zod";
import { REAL_HOTEL_SNAPSHOT_DATE,REAL_HOTEL_SOURCE_NOTE,realHotelReferenceUrl,realHotels } from "@/src/data/real-hotels";
import { databaseConfigured } from "@/src/db/client";
import { fallbackDirectoryReference,listDirectoryHotels } from "@/src/db/directory";
import { enforceRateLimit,requestFingerprint } from "@/src/security/rate-limit";
export const runtime="nodejs";
const Query=z.object({q:z.string().max(120).optional(),region:z.enum(["All","Europe","Asia","Africa","Americas"]).default("All"),limit:z.coerce.number().int().min(1).max(60).default(24),offset:z.coerce.number().int().min(0).max(10000).default(0)});
const keyOf=(h:{name:string;city:string;country:string})=>[h.name,h.city,h.country].join("|").normalize("NFD").replace(/[\u0300-\u036f]/g,"").toLowerCase();
export async function GET(req:Request){
  const gate=await enforceRateLimit({key:requestFingerprint(req,"real-hotel-directory"),limit:180,windowSeconds:60});if(!gate.allowed)return Response.json({error:"rate-limited"},{status:429});
  const url=new URL(req.url);const parsed=Query.safeParse({q:url.searchParams.get("q")||undefined,region:url.searchParams.get("region")||"All",limit:url.searchParams.get("limit")||24,offset:url.searchParams.get("offset")||0});
  if(!parsed.success)return Response.json({error:"invalid-query",issues:parsed.error.issues},{status:400});
  const q=(parsed.data.q||"").trim().toLowerCase();
  const seed=realHotels.filter(h=>(parsed.data.region==="All"||h.region===parsed.data.region)&&(!q||[h.name,h.city,h.country].join(" ").toLowerCase().includes(q))).map(h=>({...h,canonicalId:h.id,lat:null,lng:null,source:"curated_seed",sourceId:h.id,website:null,referenceUrl:realHotelReferenceUrl(h)}));
  let imported:Array<any>=[];
  if(databaseConfigured()){
    const db=await listDirectoryHotels({q:parsed.data.q,region:parsed.data.region,limit:5000,offset:0,maxRows:5000}).catch(()=>null);
    imported=(db?.hotels||[]).map(h=>({...h,referenceUrl:h.referenceUrl||fallbackDirectoryReference(h)}));
  }
  const merged=new Map<string,any>();for(const h of seed)merged.set(keyOf(h),h);for(const h of imported)merged.set(keyOf(h),h);
  const all=[...merged.values()].sort((a,b)=>a.name.localeCompare(b.name)||a.city.localeCompare(b.city));
  const page=all.slice(parsed.data.offset,parsed.data.offset+parsed.data.limit).map(h=>({...h,entityState:"REAL_PROPERTY" as const,commercialState:"RATE_PENDING" as const}));
  return Response.json({source:imported.length?"merged-directory":"public-entity-seed",snapshotDate:REAL_HOTEL_SNAPSHOT_DATE,note:REAL_HOTEL_SOURCE_NOTE,attribution:page.some(h=>h.source==="openstreetmap")?"OpenStreetMap data © OpenStreetMap contributors":null,total:all.length,offset:parsed.data.offset,limit:parsed.data.limit,hotels:page},{headers:{"Cache-Control":"public, s-maxage=300, stale-while-revalidate=3600"}});
}