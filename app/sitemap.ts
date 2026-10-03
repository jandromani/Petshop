import type { MetadataRoute } from "next";
import { listSellableOffers } from "@/src/db/catalog";
import { indexableDiscoveryPages } from "@/src/seo/live";
import { canonicalSiteUrl,publicSiteConfigured } from "@/src/system/site-url";

export default async function sitemap():Promise<MetadataRoute.Sitemap>{
  const base=canonicalSiteUrl();
  if(!publicSiteConfigured())return[];

  const allowLive=process.env.SEO_LIVE_INDEXING==="true";
  const [offers,discovery]=allowLive
    ? await Promise.all([listSellableOffers({limit:50}),indexableDiscoveryPages()])
    : [[],[]] as const;

  const liveSlugs=[...new Set(offers.map(o=>o.slug))];
  return[
    {url:base,changeFrequency:"daily",priority:1},
    ...liveSlugs.map(slug=>({url:base+"/live/"+slug,changeFrequency:"daily" as const,priority:.8})),
    ...discovery.map(x=>({url:base+"/discover/"+x.page.slug,changeFrequency:"daily" as const,priority:.8})),
  ];
}
