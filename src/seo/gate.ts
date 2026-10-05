export type SeoEvidence={
  liveIndexingEnabled:boolean;
  customDomain:boolean;
  searchConsoleReady:boolean;
  uniqueCanonical:boolean;
  uniqueCopy:boolean;
  sellableHotels:number;
  uniqueCountries:number;
  hasFreshProviderEvidence:boolean;
  nonEmptyIntent:boolean;
  structuredDataValid:boolean;
};

export type SeoGate={index:boolean;reasons:string[]};

export function seoGate(e:SeoEvidence):SeoGate{
  const reasons:string[]=[];
  if(!e.liveIndexingEnabled)reasons.push("live indexing feature flag disabled");
  if(!e.customDomain)reasons.push("custom domain not configured");
  if(!e.searchConsoleReady)reasons.push("Search Console verification missing");
  if(!e.uniqueCanonical)reasons.push("canonical is missing or not unique");
  if(!e.uniqueCopy)reasons.push("page lacks unique user value");
  if(e.sellableHotels<3)reasons.push("fewer than 3 sellable hotels");
  if(e.uniqueCountries<1)reasons.push("no geographic evidence");
  if(!e.hasFreshProviderEvidence)reasons.push("no fresh provider evidence");
  if(!e.nonEmptyIntent)reasons.push("search intent is empty or unsupported");
  if(!e.structuredDataValid)reasons.push("structured data prerequisites not met");
  return{index:reasons.length===0,reasons};
}
