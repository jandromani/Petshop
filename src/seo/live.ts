import { listSellableOffers } from "@/src/db/catalog";
import { DISCOVERY_PAGES,discoveryBySlug } from "@/src/seo/catalog";
import { seoGate } from "@/src/seo/gate";
import type { LiveCatalogOffer } from "@/src/core/live-offers";

export type LiveDiscoveryMode="budget"|"board"|"region"|"unsupported";

export function liveDiscoveryMode(slug:string):LiveDiscoveryMode{
  if(slug==="under-1500-month")return"budget";
  if(slug==="all-inclusive")return"board";
  if(slug==="best-value-asia")return"region";
  return"unsupported";
}

export function filterLiveDiscovery(slug:string,offers:LiveCatalogOffer[]){
  if(slug==="under-1500-month")return offers.filter(o=>o.monthlyEquivalent<=1500);
  if(slug==="all-inclusive")return offers.filter(o=>String(o.board||"").toLowerCase().replaceAll("-"," ").includes("all inclusive"));
  if(slug==="best-value-asia")return offers.filter(o=>o.region==="Asia");
  return[];
}

export async function liveDiscoveryEvidence(slug:string){
  const page=discoveryBySlug(slug);
  if(!page)return null;
  const mode=liveDiscoveryMode(slug);
  const source=mode==="unsupported"?[]:await listSellableOffers({limit:50});
  const offers=filterLiveDiscovery(slug,source);
  const countries=new Set(offers.map(o=>o.country));
  const gate=seoGate({
    liveIndexingEnabled:process.env.SEO_LIVE_INDEXING==="true",
    sellableHotels:new Set(offers.map(o=>o.hotelId)).size,
    uniqueCountries:countries.size,
    hasFreshProviderEvidence:offers.length>0&&offers.every(o=>new Date(o.expiresAt||0).getTime()>Date.now()),
    uniqueNarrative:true,
  });
  if(mode==="unsupported"&&gate.index){
    return{page,offers,mode,gate:{index:false,reasons:["intent lacks normalized live evidence dimensions"]}};
  }
  return{page,offers,mode,gate};
}

export async function indexableDiscoveryPages(){
  const results=await Promise.all(DISCOVERY_PAGES.map(p=>liveDiscoveryEvidence(p.slug)));
  return results.filter((x):x is NonNullable<typeof x>=>Boolean(x?.gate.index));
}
