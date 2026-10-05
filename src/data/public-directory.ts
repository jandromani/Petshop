import { realHotels,realHotelReferenceUrl,REAL_HOTEL_SNAPSHOT_DATE,REAL_HOTEL_SOURCE_NOTE } from "@/src/data/real-hotels";
import { overtureHotels } from "@/src/data/overture-hotels";

export function publicDirectorySnapshot(limit=24){
  const curated=realHotels.map(h=>({...h,canonicalId:h.id,lat:null,lng:null,source:"curated_seed",sourceId:h.id,website:null,address:null,confidence:null,description:null,photoUrls:[] as string[],facilities:[] as string[],referenceUrl:realHotelReferenceUrl(h),commercialState:"RATE_PENDING" as const,entityState:"REAL_PROPERTY" as const,liveOffer:null,preferenceScore:0,matchedPreferences:[] as string[]}));
  const overture=overtureHotels.map(h=>({...h,canonicalId:h.id,source:"overture",description:null,photoUrls:[] as string[],facilities:[] as string[],commercialState:"RATE_PENDING" as const,entityState:"REAL_PROPERTY" as const,liveOffer:null,preferenceScore:0,matchedPreferences:[] as string[]}));
  const key=(h:{name:string;city:string;country:string})=>[h.name,h.city,h.country].join("|").normalize("NFD").replace(/[\u0300-\u036f]/g,"").toLowerCase();
  const merged=new Map<string,any>();for(const h of curated)merged.set(key(h),h);for(const h of overture)merged.set(key(h),h);
  const all=[...merged.values()].sort((a,b)=>(b.confidence||0)-(a.confidence||0)||a.name.localeCompare(b.name)||a.city.localeCompare(b.city));
  return{source:overtureHotels.length?"overture-snapshot+curated":"public-entity-seed",snapshotDate:REAL_HOTEL_SNAPSHOT_DATE,note:REAL_HOTEL_SOURCE_NOTE,attribution:overtureHotels.length?"Overture Maps Foundation":null,total:all.length,mapped:all.filter(h=>Number.isFinite(h.lat)&&Number.isFinite(h.lng)).length,hotels:all.slice(0,Math.max(1,Math.min(60,limit)))};
}