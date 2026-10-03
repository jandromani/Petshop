import { databaseConfigured } from "@/src/db/client";
import { liveProviderStatuses } from "@/src/providers/live/registry";
import { getOpsSnapshot } from "@/src/db/ops";
import { canonicalSiteUrl,publicSiteConfigured } from "@/src/system/site-url";

export type ActivationState="ACTIVE"|"READY"|"ACTIVATION_REQUIRED"|"OPTIONAL";

export async function activationManifest(){
  const providers=liveProviderStatuses();
  const ops=await getOpsSnapshot();
  const providerConfigured=providers.some(p=>p.configured);
  const supplyActive=ops.liveOffers>0;

  const items=[
    {
      key:"database",
      state:(databaseConfigured()?"ACTIVE":"ACTIVATION_REQUIRED") as ActivationState,
      detail:databaseConfigured()?"Persistent operational ledger configured.":"Set DATABASE_URL and apply migrations 001–008.",
    },
    {
      key:"ops-security",
      state:(process.env.OPS_ACCESS_KEY?"ACTIVE":"ACTIVATION_REQUIRED") as ActivationState,
      detail:process.env.OPS_ACCESS_KEY?"Signed operations sessions can be issued.":"Set OPS_ACCESS_KEY.",
    },
    {
      key:"cron-security",
      state:(process.env.CRON_SECRET?"ACTIVE":"ACTIVATION_REQUIRED") as ActivationState,
      detail:process.env.CRON_SECRET?"Scheduled workflow endpoints are protected.":"Set CRON_SECRET.",
    },
    {
      key:"canonical-site",
      state:(publicSiteConfigured()?"ACTIVE":"ACTIVATION_REQUIRED") as ActivationState,
      detail:publicSiteConfigured()?canonicalSiteUrl():"Set NEXT_PUBLIC_SITE_URL or deploy on Vercel production.",
    },
    {
      key:"hotel-supply",
      state:(supplyActive?"ACTIVE":providerConfigured?"READY":"ACTIVATION_REQUIRED") as ActivationState,
      detail:supplyActive
        ? ops.liveOffers+" live offers ("+ops.providerLiveOffers+" provider + "+ops.directLiveOffers+" direct)."
        : providerConfigured
          ? "Provider credentials exist; a fresh live wave/direct contract must create SELLABLE inventory."
          : "Connect Booking/RateHawk/HBX credentials or publish a verified direct contract.",
    },
    {
      key:"conversion-ingest",
      state:(process.env.CONVERSION_INGEST_SECRET?"ACTIVE":"ACTIVATION_REQUIRED") as ActivationState,
      detail:process.env.CONVERSION_INGEST_SECRET?"Authenticated conversion ingestion enabled.":"Set CONVERSION_INGEST_SECRET for non-Booking conversion callbacks/imports.",
    },
    {
      key:"agent-runtime",
      state:(process.env.OPENROUTER_API_KEY&&process.env.AGENT_RUNTIME_ENABLED!=="false"?"ACTIVE":"OPTIONAL") as ActivationState,
      detail:process.env.OPENROUTER_API_KEY?"Governed OpenRouter runtime configured.":"Optional: set OPENROUTER_API_KEY to activate bounded agents.",
    },
    {
      key:"seo-indexing",
      state:(process.env.SEO_LIVE_INDEXING==="true"?"READY":"OPTIONAL") as ActivationState,
      detail:process.env.SEO_LIVE_INDEXING==="true"?"Evidence-backed live pages may index.":"Optional: enable only when commercial live inventory exists.",
    },
    {
      key:"github-vercel-deploy-token",
      state:"ACTIVATION_REQUIRED" as ActivationState,
      detail:"Runtime cannot inspect GitHub Secrets. VERCEL_TOKEN must exist in GitHub Actions for automated production deployment.",
    },
  ];

  return{
    generatedAt:new Date().toISOString(),
    softwareClosed:true,
    activationComplete:items.filter(x=>x.state!=="OPTIONAL"&&x.key!=="github-vercel-deploy-token").every(x=>x.state==="ACTIVE"),
    items,
  };
}
