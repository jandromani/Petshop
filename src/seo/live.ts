import { listSellableOffers } from "@/src/db/catalog";
import { DISCOVERY_PAGES,discoveryBySlug } from "@/src/seo/catalog";
import { destinationSeoPages,type DestinationSeoPage } from "@/src/seo/destinations";
import { seoGate } from "@/src/seo/gate";
import type { LiveCatalogOffer } from "@/src/core/live-offers";
import { canonicalSiteUrl,customPublicDomainConfigured,searchConsoleVerificationConfigured } from "@/src/system/site-url";

export type LiveDiscoveryMode="budget"|"board"|"region"|"unsupported";

export function seoAutopilotEnabled(){
  const mode=(process.env.SEO_LIVE_INDEXING||"auto").toLowerCase();
  if(mode==="false")return false;
  const externalReady=customPublicDomainConfigured()&&searchConsoleVerificationConfigured();
  return mode==="true"?externalReady:externalReady;
}

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

function narrativeKey(page:{headline:string;description:string}){
  return (page.headline+" "+page.description).toLowerCase().replace(/[^a-z0-9]+/g," ").trim();
}
function fresh(offers:LiveCatalogOffer[]){
  return offers.length>0&&offers.every(o=>new Date(o.expiresAt||0).getTime()>Date.now());
}
function structuredOfferValid(o:LiveCatalogOffer){
  return Boolean(o.hotelId&&o.name&&o.city&&o.country&&o.currency&&Number.isFinite(o.displayPrice)&&o.displayPrice>=0&&o.checkIn);
}
function canonicalReady(path:string){
  const canonical=canonicalSiteUrl()+path;
  try{return new URL(canonical).pathname===path&&customPublicDomainConfigured()}catch{return false}
}

export function uniqueDiscoveryNarrative(slug:string){
  const page=discoveryBySlug(slug);if(!page)return false;
  const key=narrativeKey(page);
  return DISCOVERY_PAGES.filter(p=>narrativeKey(p)===key).length===1&&page.description.trim().length>=40;
}

export async function liveDiscoveryEvidence(slug:string){
  const page=discoveryBySlug(slug);if(!page)return null;
  const mode=liveDiscoveryMode(slug);
  const source=mode==="unsupported"?[]:await listSellableOffers({limit:50});
  const offers=filterLiveDiscovery(slug,source);
  const gate=seoGate({
    liveIndexingEnabled:seoAutopilotEnabled(),
    customDomain:customPublicDomainConfigured(),
    searchConsoleReady:searchConsoleVerificationConfigured(),
    uniqueCanonical:canonicalReady("/discover/"+slug),
    uniqueCopy:uniqueDiscoveryNarrative(slug),
    sellableHotels:new Set(offers.map(o=>o.hotelId)).size,
    uniqueCountries:new Set(offers.map(o=>o.country)).size,
    hasFreshProviderEvidence:fresh(offers),
    nonEmptyIntent:mode!=="unsupported"&&Boolean(page.intent.trim()),
    structuredDataValid:offers.length>0&&offers.every(structuredOfferValid),
  });
  return{page,offers,mode,gate:mode==="unsupported"?{index:false,reasons:[...gate.reasons,"intent lacks normalized live evidence dimensions"]}:gate};
}

export async function destinationSeoEvidence(page:DestinationSeoPage){
  const offers=(await listSellableOffers({q:page.market,limit:50})).filter(o=>o.city.toLowerCase()===page.market.toLowerCase());
  const gate=seoGate({
    liveIndexingEnabled:seoAutopilotEnabled(),
    customDomain:customPublicDomainConfigured(),
    searchConsoleReady:searchConsoleVerificationConfigured(),
    uniqueCanonical:canonicalReady("/destinations/"+page.slug),
    uniqueCopy:page.hotels>=20&&page.market.trim().length>1,
    sellableHotels:new Set(offers.map(o=>o.hotelId)).size,
    uniqueCountries:new Set(offers.map(o=>o.country)).size,
    hasFreshProviderEvidence:fresh(offers),
    nonEmptyIntent:true,
    structuredDataValid:offers.length>0&&offers.every(structuredOfferValid),
  });
  return{page,offers,gate};
}

export async function indexableDiscoveryPages(){
  const results=await Promise.all(DISCOVERY_PAGES.map(p=>liveDiscoveryEvidence(p.slug)));
  return results.filter((x):x is NonNullable<typeof x>=>Boolean(x?.gate.index));
}

export async function indexableDestinationPages(){
  const candidates=destinationSeoPages.filter(x=>x.indexable);
  const results=await Promise.all(candidates.map(destinationSeoEvidence));
  return results.filter(x=>x.gate.index);
}
