import type { MetadataRoute } from "next";
import { listSellableOffers } from "@/src/db/catalog";
import { indexableDiscoveryPages,indexableDestinationPages,seoAutopilotEnabled } from "@/src/seo/live";
import { canonicalSiteUrl,publicSiteConfigured } from "@/src/system/site-url";
import { ES_DISCOVERY } from "@/src/seo/es-catalog";

export default async function sitemap():Promise<MetadataRoute.Sitemap>{
  const base=canonicalSiteUrl();
  if(!publicSiteConfigured()||!seoAutopilotEnabled())return[];

  const [offers,discovery,destinations]=await Promise.all([
    listSellableOffers({limit:200}),
    indexableDiscoveryPages(),
    indexableDestinationPages(),
  ]);
  const liveSlugs=[...new Set(offers.map(o=>o.slug))];
  const esIndexable=new Set(discovery.map(x=>x.page.slug));
  return[
    {url:base,changeFrequency:"daily",priority:1},
    ...destinations.map(x=>({url:base+"/destinations/"+x.page.slug,changeFrequency:"daily" as const,priority:.85})),
    ...liveSlugs.map(slug=>({url:base+"/live/"+slug,changeFrequency:"daily" as const,priority:.85})),
    ...discovery.map(x=>({url:base+"/discover/"+x.page.slug,changeFrequency:"daily" as const,priority:.8})),
    ...ES_DISCOVERY.filter(x=>esIndexable.has(x.sourceSlug)).map(x=>({url:base+"/es/descubrir/"+x.slug,changeFrequency:"daily" as const,priority:.78})),
  ];
}
