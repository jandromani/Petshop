import { REAL_HOTEL_SNAPSHOT_DATE,REAL_HOTEL_SOURCE_NOTE } from "@/src/data/real-hotels";
import { enrichedCuratedHotels,curatedGeoSourceIds } from "@/src/data/curated-enrichment";
import { overtureHotels } from "@/src/data/overture-hotels";

import { matchesDirectorySearch,resolveSearchScope,type SearchScope } from "@/src/core/directory-search";

export type PublicDirectorySnapshotInput={
  searchScope?:SearchScope;
  q?:string;
  region?:"All"|"Europe"|"Asia"|"Africa"|"Americas";
  brand?:string;
  brandedOnly?:boolean;
};

const norm=(value:string)=>value.normalize("NFD").replace(/[\u0300-\u036f]/g,"").toLowerCase();

export function publicDirectorySnapshot(limit=24,input:PublicDirectorySnapshotInput={}){
  const curated=enrichedCuratedHotels.map(h=>({...h,commercialState:"RATE_PENDING" as const,entityState:"REAL_PROPERTY" as const,liveOffer:null,preferenceScore:0,matchedPreferences:[] as string[],unconfirmedPreferences:[] as string[],why:h.geoSource==="overture"?["Curated identity reconciled to Overture coordinates"]:["Curated real-property identity"]}));
  const overture=overtureHotels.filter(h=>!curatedGeoSourceIds.has(h.sourceId)).map(h=>({...h,canonicalId:h.id,source:"overture",description:null,photoUrls:[] as string[],facilities:[] as string[],commercialState:"RATE_PENDING" as const,entityState:"REAL_PROPERTY" as const,liveOffer:null,preferenceScore:0,matchedPreferences:[] as string[],unconfirmedPreferences:[] as string[],why:["Mapped real-world property identity",...(h.brand?["Brand evidence: "+h.brand]:[]),...(h.website?["Official website available"]:[])]}));
  const key=(h:{name:string;city:string;country:string})=>[h.name,h.city,h.country].join("|").normalize("NFD").replace(/[\u0300-\u036f]/g,"").toLowerCase();
  const curatedOrder=new Map(curated.map((h,i)=>[key(h),i]));
  const q=norm(input.q||"");
  const scope=resolveSearchScope(q,input.searchScope||"auto",[...curated,...overture]);
  const brand=norm(input.brand||"");
  const rows=[...curated,...overture].filter((h:any)=>{
    if(input.region&&input.region!=="All"&&h.region!==input.region)return false;
    if(input.brandedOnly&&!h.brand)return false;
    if(brand&&!norm(h.brand||"").includes(brand))return false;
    if(!matchesDirectorySearch(h,q,scope))return false;
    return true;
  });
  const merged=new Map<string,any>();for(const h of rows)merged.set(key(h),h);
  const all=[...merged.values()].sort((a,b)=>{
    const ai=curatedOrder.get(key(a)),bi=curatedOrder.get(key(b));
    if(ai!==undefined||bi!==undefined){if(ai!==undefined&&bi!==undefined)return ai-bi;return ai!==undefined?-1:1;}
    const website=Number(Boolean(b.website))-Number(Boolean(a.website));if(website)return website;
    const confidence=Number(b.confidence||0)-Number(a.confidence||0);if(confidence)return confidence;
    return a.name.localeCompare(b.name)||a.city.localeCompare(b.city);
  });
  return{
    search:{scope,query:input.q||""},
    source:overtureHotels.length?"overture-snapshot+curated":"public-entity-seed",
    snapshotDate:REAL_HOTEL_SNAPSHOT_DATE,note:REAL_HOTEL_SOURCE_NOTE,
    attribution:overtureHotels.length?"Overture Maps Foundation":null,
    total:all.length,mapped:all.filter(h=>Number.isFinite(h.lat)&&Number.isFinite(h.lng)).length,
    facets:{verified:0,branded:all.filter(h=>Boolean(h.brand)).length,officialWebsite:all.filter(h=>Boolean(h.website)).length,mapped:all.filter(h=>Number.isFinite(h.lat)&&Number.isFinite(h.lng)).length},
    relaxations:all.length?[]:[...(q?[{action:"clear_query",label:"Clear destination/name"}]:[]),...(input.region&&input.region!=="All"?[{action:"all_regions",label:"Search all regions"}]:[]),...(brand?[{action:"clear_brand",label:"Any brand"}]:[])],
    hotels:all.slice(0,Math.max(1,Math.min(60,limit))),
  };
}
