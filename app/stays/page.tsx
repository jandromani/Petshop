import type { Metadata } from "next";
import RealHotelDirectory,{type DirectoryPayload} from "@/components/RealHotelDirectory";
import { realHotels,realHotelReferenceUrl,REAL_HOTEL_SNAPSHOT_DATE,REAL_HOTEL_SOURCE_NOTE } from "@/src/data/real-hotels";
import { overtureHotels } from "@/src/data/overture-hotels";

export const metadata:Metadata={title:"Real hotel directory",description:"Browse real hotels for 30–365 day stays. Property identity is kept separate from verified long-stay pricing.",robots:{index:false,follow:true}};

function initialDirectory():DirectoryPayload{
  const curated=realHotels.map(h=>({...h,canonicalId:h.id,lat:null,lng:null,source:"curated_seed",sourceId:h.id,website:null,address:null,confidence:null,description:null,photoUrls:[],facilities:[],referenceUrl:realHotelReferenceUrl(h),commercialState:"RATE_PENDING" as const,entityState:"REAL_PROPERTY" as const,liveOffer:null}));
  const overture=overtureHotels.map(h=>({...h,canonicalId:h.id,source:"overture",description:null,photoUrls:[],facilities:[],commercialState:"RATE_PENDING" as const,entityState:"REAL_PROPERTY" as const,liveOffer:null}));
  const key=(h:{name:string;city:string;country:string})=>[h.name,h.city,h.country].join("|").normalize("NFD").replace(/[\u0300-\u036f]/g,"").toLowerCase();
  const merged=new Map<string,any>();for(const h of curated)merged.set(key(h),h);for(const h of overture)merged.set(key(h),h);
  const all=[...merged.values()].sort((a,b)=>(b.confidence||0)-(a.confidence||0)||a.name.localeCompare(b.name));
  return{source:overtureHotels.length?"overture-snapshot+curated":"public-entity-seed",snapshotDate:REAL_HOTEL_SNAPSHOT_DATE,note:REAL_HOTEL_SOURCE_NOTE,attribution:overtureHotels.length?"Overture Maps Foundation":null,total:all.length,mapped:all.filter(h=>Number.isFinite(h.lat)&&Number.isFinite(h.lng)).length,hotels:all.slice(0,24)};
}

export default function StaysPage(){return <main className="seoPage"><RealHotelDirectory initialData={initialDirectory()}/></main>;}