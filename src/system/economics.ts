import { getOpsSnapshot } from "@/src/db/ops";
import { growthFunnel,acquisitionBreakdown } from "@/src/db/growth";
import { revenueCurrencyExposure } from "@/src/db/revenue";
import { FX_POLICY_VERSION,REPORTING_CURRENCY } from "@/src/money/fx";

export async function getEconomicsSnapshot(days=30){
  const bounded=Math.max(1,Math.min(365,days));
  const [ops,funnel,acquisition,currencyExposure]=await Promise.all([
    getOpsSnapshot(),
    growthFunnel(bounded),
    acquisitionBreakdown(bounded),
    revenueCurrencyExposure(bounded),
  ]);

  const clicks=ops.referralClicks30d;
  const conversions=ops.conversions30d;
  const commission=ops.commission30d;
  const conversionRate=clicks>0?conversions/clicks:null;
  const commissionPerClick=clicks>0?commission/clicks:null;
  const commissionPerConversion=conversions>0?commission/conversions:null;

  return{
    generatedAt:new Date().toISOString(),
    windowDays:bounded,
    northStar:"confirmed long-stay bookings with traceable referral evidence",
    reportingCurrency:REPORTING_CURRENCY,
    fxPolicy:{
      version:FX_POLICY_VERSION,
      rule:"Native transaction currency is immutable. Non-EUR amounts are excluded from consolidated EUR totals unless explicit matching FX-rate evidence is persisted.",
    },
    observed:{
      liveOffers:ops.liveOffers,
      referralClicks:clicks,
      conversions,
      commissionEur:commission,
      conversionRate,
      commissionPerClickEur:commissionPerClick,
      commissionPerConversionEur:commissionPerConversion,
      funnel,
      acquisition,
      currencyExposure,
    },
    unavailableUntilEvidence:{
      cac:"No paid spend ledger is connected; CAC is intentionally null.",
      contributionMargin:"Hosting, AI, provider, support and tax costs are not yet reconciled into one cost ledger.",
      repeatRate:"Consumer identity/lifecycle persistence is not yet available.",
      directVsOtaMargin:"Requires real direct and OTA conversions.",
    },
    proofState:conversions>0&&commission>0?"COMMERCIAL_EVIDENCE_OBSERVED":"UNPROVEN",
  };
}
