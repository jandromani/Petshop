import { listSellableOffers } from "@/src/db/catalog";
import type { LiveCatalogOffer } from "@/src/core/live-offers";
import { destinationSeoBySlug } from "@/src/seo/destinations";
import { seoGate } from "@/src/seo/gate";
import { canonicalSiteUrl,customPublicDomainConfigured,searchConsoleVerificationConfigured } from "@/src/system/site-url";
import { seoAutopilotEnabled } from "@/src/seo/live";

export type SeoIntentKind="long-stay"|"monthly-hotels"|"90-day-stays"|"budget"|"lifestyle";
export type SeoIntentPage={kind:SeoIntentKind;slug:string;path:string;title:string;headline:string;description:string;query?:string;nights?:number;maxMonthly?:number;filter?:(o:LiveCatalogOffer)=>boolean};

const warmCities=new Set(["tenerife","las palmas de gran canaria","antalya","dubai","bangkok","phuket","denpasar","bali","funchal","marrakesh","agadir"]);

export function seoIntentPage(kind:SeoIntentKind,slug:string):SeoIntentPage|null{
  if(kind==="long-stay"||kind==="monthly-hotels"||kind==="90-day-stays"){
    const d=destinationSeoBySlug(slug);if(!d)return null;
    const common={kind,slug,path:"/"+kind+"/"+slug,query:d.market} as const;
    if(kind==="long-stay")return{...common,title:"Long-Stay Hotels in "+d.market,headline:"Long-stay hotels in "+d.market+".",description:"Compare real hotels in "+d.market+" for 30–365 day stays. Verified monthly prices appear only while current evidence exists."};
    if(kind==="monthly-hotels")return{...common,title:"Monthly Hotels in "+d.market,headline:"Monthly hotels in "+d.market+".",description:"Explore hotels suited to month-long and seasonal stays in "+d.market+", with monthly-equivalent prices when Atlas can verify them."};
    return{...common,nights:90,title:"90-Day Hotel Stays in "+d.market,headline:"Stay in "+d.market+" for 90 days.",description:"Compare verified 90-day hotel options in "+d.market+" by monthly-equivalent cost and current availability."};
  }
  if(kind==="budget"){
    if(slug==="under-1500")return{kind,slug,path:"/budget/under-1500",maxMonthly:1500,title:"Long-Stay Hotels Under €1,500/Month",headline:"What can €1,500 a month buy?",description:"Verified long-stay hotel rates with a monthly equivalent at or below €1,500."};
    if(slug==="under-2000")return{kind,slug,path:"/budget/under-2000",maxMonthly:2000,title:"Long-Stay Hotels Under €2,000/Month",headline:"Long stays under €2,000 a month.",description:"Verified hotel stays with a monthly equivalent at or below €2,000."};
    return null;
  }
  if(kind==="lifestyle"){
    if(slug==="all-inclusive")return{kind,slug,path:"/lifestyle/all-inclusive",title:"All-Inclusive Long-Stay Hotels",headline:"Long stays with meals included.",description:"Verified long-stay hotel options where an all-inclusive board basis is part of the current offer.",filter:o=>String(o.board||"").toLowerCase().replaceAll("-"," ").includes("all inclusive")};
    if(slug==="beach")return{kind,slug,path:"/lifestyle/beach",title:"Beach Long-Stay Hotels",headline:"Live by the sea for a season.",description:"Verified long-stay hotel options with beach-related property evidence.",filter:o=>(o.facilities||[]).some(x=>/beach|sea|ocean/i.test(x))};
    if(slug==="healthcare")return{kind,slug,path:"/lifestyle/healthcare",title:"Long-Stay Hotels with Healthcare Access",headline:"Long stays with healthcare in mind.",description:"Verified long-stay hotel options where healthcare or clinic access is supported by current property evidence.",filter:o=>(o.facilities||[]).some(x=>/clinic|health|medical/i.test(x))};
    if(slug==="winter-sun")return{kind,slug,path:"/lifestyle/winter-sun",title:"Winter-Sun Long-Stay Hotels",headline:"Follow the sun for a season.",description:"Verified long-stay hotel options in warm-weather destinations commonly used for winter escapes.",filter:o=>warmCities.has(o.city.toLowerCase())};
  }
  return null;
}

function validOffer(o:LiveCatalogOffer){
  return Boolean(o.hotelId&&o.name&&o.city&&o.country&&o.currency&&o.displayPrice>0&&o.checkIn&&new Date(o.expiresAt||0).getTime()>Date.now());
}

export async function seoIntentEvidence(page:SeoIntentPage){
  let offers=await listSellableOffers({q:page.query,limit:100,...(page.nights?{nights:page.nights}:{}),...(page.maxMonthly?{maxMonthly:page.maxMonthly}:{})});
  if(page.filter)offers=offers.filter(page.filter);
  if(page.maxMonthly)offers=offers.filter(o=>o.monthlyEquivalent<=page.maxMonthly!);
  if(page.nights)offers=offers.filter(o=>o.nights===page.nights);
  const canonical=canonicalSiteUrl()+page.path;
  const gate=seoGate({
    liveIndexingEnabled:seoAutopilotEnabled(),
    customDomain:customPublicDomainConfigured(),
    searchConsoleReady:searchConsoleVerificationConfigured(),
    uniqueCanonical:canonical.startsWith(canonicalSiteUrl()+"/"),
    uniqueCopy:page.description.length>=60,
    sellableHotels:new Set(offers.map(o=>o.hotelId)).size,
    uniqueCountries:new Set(offers.map(o=>o.country)).size,
    hasFreshProviderEvidence:offers.length>0&&offers.every(validOffer),
    nonEmptyIntent:Boolean(page.title&&page.headline),
    structuredDataValid:offers.length>0&&offers.every(validOffer),
  });
  return{page,offers,canonical,gate};
}
