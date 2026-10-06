import { informationalIndexingEnabled } from "@/src/seo/public";
import { MONTHLY_STAY_GUIDES } from "@/src/seo/monthly-stays";
import type { MetadataRoute } from "next";
import { listSellableOffers } from "@/src/db/catalog";
import { indexableDiscoveryPages,indexableDestinationPages,seoAutopilotEnabled } from "@/src/seo/live";
import { canonicalSiteUrl,publicSiteConfigured } from "@/src/system/site-url";
import { ES_DISCOVERY } from "@/src/seo/es-catalog";

export default async function sitemap():Promise<MetadataRoute.Sitemap>{
  const base=canonicalSiteUrl();
  if(!publicSiteConfigured())return[];
  const informational=informationalIndexingEnabled()?["","/for-hotels",...MONTHLY_STAY_GUIDES.map(x=>"/monthly-stays/"+x.slug)].flatMap(path=>[{url:base+path,changeFrequency:"monthly" as const,priority:path?0.8:1},{url:base+"/es"+path,changeFrequency:"monthly" as const,priority:path?0.8:1}]):[];
  if(!seoAutopilotEnabled())return informational;

  const [offers,discovery,destinations]=await Promise.all([
    listSellableOffers({limit:200}),
    indexableDiscoveryPages(),
    indexableDestinationPages(),
  ]);
  const liveSlugs=[...new Set(offers.map(o=>o.slug))];
  const esIndexable=new Set(discovery.map(x=>x.page.slug));
  const entries:MetadataRoute.Sitemap=[
    ...informational,
    {url:base,changeFrequency:"daily",priority:1},
    {url:base+"/about",changeFrequency:"monthly",priority:.7},
    {url:base+"/for-hotels",changeFrequency:"monthly",priority:.7},
    {url:base+"/stay-readiness",changeFrequency:"monthly",priority:.72},
    {url:base+"/geographic-arbitrage",changeFrequency:"monthly",priority:.78},
    {url:base+"/methodology",changeFrequency:"monthly",priority:.65},
    ...destinations.map(x=>({url:base+"/destinations/"+x.page.slug,changeFrequency:"daily" as const,priority:.85})),
    ...liveSlugs.map(slug=>({url:base+"/live/"+slug,changeFrequency:"daily" as const,priority:.85})),
    ...discovery.map(x=>({url:base+"/discover/"+x.page.slug,changeFrequency:"daily" as const,priority:.8})),
    ...ES_DISCOVERY.filter(x=>esIndexable.has(x.sourceSlug)).map(x=>({url:base+"/es/descubrir/"+x.slug,changeFrequency:"daily" as const,priority:.78})),
  ];
  return [...new Map(entries.map(entry=>[entry.url,entry])).values()];
}
