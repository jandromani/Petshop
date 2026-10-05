import type { MetadataRoute } from "next";
import { listSellableOffers } from "@/src/db/catalog";
import { indexableDiscoveryPages,seoAutopilotEnabled } from "@/src/seo/live";
import { canonicalSiteUrl,publicSiteConfigured } from "@/src/system/site-url";
import { ES_DISCOVERY } from "@/src/seo/es-catalog";
import { destinationSeoPages } from "@/src/seo/destinations";

export default async function sitemap():Promise<MetadataRoute.Sitemap>{
  const base=canonicalSiteUrl();
  if(!publicSiteConfigured())return[];

  const allowLive=seoAutopilotEnabled();
  const [offers,discovery]=allowLive
    ? await Promise.all([listSellableOffers({limit:50}),indexableDiscoveryPages()])
    : [[],[]] as const;

  const liveSlugs=[...new Set(offers.map(o=>o.slug))];
  const esIndexable=new Set(discovery.map(x=>x.page.slug));
  return[
    {url:base,changeFrequency:"daily",priority:1},
    {url:base+"/es",changeFrequency:"daily",priority:.9},
    ...destinationSeoPages.filter(x=>x.indexable&&allowLive).map(x=>({url:base+"/destinations/"+x.slug,changeFrequency:"weekly" as const,priority:.75})),
    ...liveSlugs.map(slug=>({url:base+"/live/"+slug,changeFrequency:"daily" as const,priority:.8})),
    ...discovery.map(x=>({url:base+"/discover/"+x.page.slug,changeFrequency:"daily" as const,priority:.8})),
    ...ES_DISCOVERY.filter(x=>esIndexable.has(x.sourceSlug)).map(x=>({url:base+"/es/descubrir/"+x.slug,changeFrequency:"daily" as const,priority:.8})),
  ];
}
