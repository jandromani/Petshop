import type { MetadataRoute } from "next";
import { canonicalSiteUrl,publicSiteConfigured } from "@/src/system/site-url";

export default function robots():MetadataRoute.Robots{
  const base=canonicalSiteUrl();
  return{
    rules:{userAgent:"*",allow:"/",disallow:["/control","/hotel-desk","/ops","/api/ops","/api/hotel-desk"]},
    sitemap:publicSiteConfigured()?base+"/sitemap.xml":undefined,
  };
}
