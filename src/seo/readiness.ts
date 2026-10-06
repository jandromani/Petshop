import { informationalIndexingEnabled } from "@/src/seo/public";
import { destinationSeoPages } from "@/src/seo/destinations";
import { indexableDiscoveryPages,seoAutopilotEnabled } from "@/src/seo/live";
import { canonicalSiteUrl,customPublicDomainConfigured,publicSiteConfigured,searchConsoleVerificationConfigured } from "@/src/system/site-url";

export async function seoReadiness(){
  const discovery=await indexableDiscoveryPages().catch(()=>[]);
  const destinations=destinationSeoPages.filter(x=>x.indexable);
  return{
    canonical:canonicalSiteUrl(),
    publicSiteConfigured:publicSiteConfigured(),
    customDomainConfigured:customPublicDomainConfigured(),
    googleVerificationConfigured:searchConsoleVerificationConfigured(),
    indexingEnabled:seoAutopilotEnabled(),
    informationalIndexingEnabled:informationalIndexingEnabled(),
    destinationPagesReady:destinations.length,
    liveDiscoveryPagesIndexable:discovery.length,
    sitemapUrl:publicSiteConfigured()?canonicalSiteUrl()+"/sitemap.xml":null,
    robotsUrl:publicSiteConfigured()?canonicalSiteUrl()+"/robots.txt":null,
    blockers:[
      ...(!customPublicDomainConfigured()?["custom domain not configured"]:[]),
      ...(!searchConsoleVerificationConfigured()?["GOOGLE_SITE_VERIFICATION missing"]:[]),
      ...(!seoAutopilotEnabled()?["SEO indexing gate closed"]:[]),
    ],
  };
}
