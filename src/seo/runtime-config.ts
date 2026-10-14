import { customPublicDomainConfigured, searchConsoleVerificationConfigured } from "@/src/system/site-url";

export function seoAutopilotEnabled(){
  const mode=(process.env.SEO_LIVE_INDEXING||"auto").toLowerCase();
  if(mode==="false")return false;
  return customPublicDomainConfigured()&&searchConsoleVerificationConfigured();
}
