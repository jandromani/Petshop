import { databaseConfigured } from "@/src/db/client";
import { liveProviderStatuses } from "@/src/providers/live/registry";
import { getOpsSnapshot } from "@/src/db/ops";
import { canonicalSiteUrl,publicSiteConfigured } from "@/src/system/site-url";
import { legalIdentity } from "@/src/system/legal";
import { adjacencyPartners } from "@/src/adjacency/registry";
import { agentModelConfigured,agentRuntimeProvider } from "@/src/agents/llm";
import { seoAutopilotEnabled } from "@/src/seo/live";

export type ActivationState="ACTIVE"|"READY"|"ACTIVATION_REQUIRED"|"OPTIONAL";

export async function activationManifest(){
  const providers=liveProviderStatuses();
  const ops=await getOpsSnapshot();
  const providerConfigured=providers.some(p=>p.configured);
  const supplyActive=ops.liveOffers>0;
  const legal=legalIdentity();
  const adjacencies=adjacencyPartners();
  const activeAdjacencies=adjacencies.filter(x=>x.configured);
  const db=databaseConfigured();
  const deployedOnVercel=process.env.VERCEL==="1"||Boolean(process.env.VERCEL_PROJECT_ID);
  const agentActive=agentModelConfigured()&&process.env.AGENT_RUNTIME_ENABLED!=="false";
  const seoAuto=seoAutopilotEnabled();

  const items=[
    {
      key:"database",
      state:(db?"ACTIVE":"ACTIVATION_REQUIRED") as ActivationState,
      detail:db?"Persistent operational ledger configured; migrations are applied by vercel-build.":"Connect DATABASE_URL; the next Vercel build will apply migrations 001–012 automatically.",
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
      key:"deployment",
      state:(deployedOnVercel?"ACTIVE":"ACTIVATION_REQUIRED") as ActivationState,
      detail:deployedOnVercel?"Git-linked Vercel deployment observed; no GitHub deployment token is required.":"Link the Git repository to the canonical Vercel project.",
    },
    {
      key:"canonical-site",
      state:(publicSiteConfigured()?"ACTIVE":"ACTIVATION_REQUIRED") as ActivationState,
      detail:publicSiteConfigured()?canonicalSiteUrl():"Set NEXT_PUBLIC_SITE_URL or attach the custom production domain.",
    },
    {
      key:"legal-operator",
      state:(legal.configured?"ACTIVE":"ACTIVATION_REQUIRED") as ActivationState,
      detail:legal.configured?legal.operator+" · "+legal.country:"Set LEGAL_OPERATOR_NAME and LEGAL_CONTACT_EMAIL before commercial launch.",
    },
    {
      key:"hotel-supply",
      state:(supplyActive?"ACTIVE":db||providerConfigured?"READY":"ACTIVATION_REQUIRED") as ActivationState,
      detail:supplyActive
        ? ops.liveOffers+" live offers ("+ops.providerLiveOffers+" provider + "+ops.directLiveOffers+" direct)."
        : db
          ? "Direct Hotel OS is ready now; provider credentials are optional accelerators."
          : providerConfigured
            ? "Provider credentials exist; persistent DB is still required."
            : "Connect the database, then publish a verified direct hotel contract or add provider credentials.",
    },
    {
      key:"conversion-ingest",
      state:(process.env.CONVERSION_INGEST_SECRET?"ACTIVE":"ACTIVATION_REQUIRED") as ActivationState,
      detail:process.env.CONVERSION_INGEST_SECRET?"Authenticated conversion ingestion enabled.":"Set CONVERSION_INGEST_SECRET.",
    },
    {
      key:"adjacency-lanes",
      state:(activeAdjacencies.length?"ACTIVE":"OPTIONAL") as ActivationState,
      detail:activeAdjacencies.length
        ? activeAdjacencies.length+" independent partner lanes active: "+activeAdjacencies.map(x=>x.kind).join(", ")+"."
        : "Optional and fail-closed until partner agreements exist.",
    },
    {
      key:"agent-runtime",
      state:(agentActive&&db?"ACTIVE":agentModelConfigured()?"READY":"OPTIONAL") as ActivationState,
      detail:agentActive
        ?"Governed runtime available via "+agentRuntimeProvider()+"; DB activates durable quotas, judges and actuation."
        :"Vercel AI Gateway/OIDC is preferred; OpenRouter remains an optional fallback.",
    },
    {
      key:"seo-indexing",
      state:(seoAuto?(supplyActive?"ACTIVE":"READY"):"OPTIONAL") as ActivationState,
      detail:seoAuto
        ? supplyActive?"SEO autopilot may index only evidence-backed pages that pass all gates.":"SEO autopilot is armed but remains NOINDEX until real sellable evidence exists."
        :"SEO indexing is explicitly disabled.",
    },
  ];

  return{
    generatedAt:new Date().toISOString(),
    softwareImplemented:true,
    activationComplete:items.filter(x=>x.state!=="OPTIONAL").every(x=>x.state==="ACTIVE"),
    items,
  };
}
