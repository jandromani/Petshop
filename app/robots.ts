import { informationalIndexingEnabled } from "@/src/seo/public";
import type { MetadataRoute } from "next";
import { canonicalSiteUrl,publicSiteConfigured } from "@/src/system/site-url";
import { seoAutopilotEnabled } from "@/src/seo/live";

export default function robots():MetadataRoute.Robots{
  const base=canonicalSiteUrl();
  return{
    rules:{
      userAgent:"*",
      allow:"/",
      disallow:["/api/","/control","/hotel-desk","/ops","/growth-desk","/requests","/es/requests","/checkout/","/es/checkout/","/hotel-portal","/es/hotel-portal","/stays?","/es/stays?"],
    },
    sitemap:publicSiteConfigured()&&(seoAutopilotEnabled()||informationalIndexingEnabled())?base+"/sitemap.xml":undefined,
    host:publicSiteConfigured()?base:undefined,
  };
}
