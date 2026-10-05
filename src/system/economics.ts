import { getOpsSnapshot } from "@/src/db/ops";
import { growthFunnel,acquisitionBreakdown,paidAttributionBreakdown } from "@/src/db/growth";
import { acquisitionSpendSummary } from "@/src/db/acquisition-spend";
import { merchantMetrics } from "@/src/db/merchant";
import { revenueCurrencyExposure,revenueEurSummary } from "@/src/db/revenue";
import { FX_POLICY_VERSION,REPORTING_CURRENCY } from "@/src/money/fx";

export async function getEconomicsSnapshot(days=30){
  const bounded=Math.max(1,Math.min(365,days));
  const [ops,funnel,acquisition,currencyExposure,eurSummary,paidAttribution,spend,merchant]=await Promise.all([
    getOpsSnapshot(),
    growthFunnel(bounded),
    acquisitionBreakdown(bounded),
    revenueCurrencyExposure(bounded),
    revenueEurSummary(bounded),
    paidAttributionBreakdown(bounded),
    acquisitionSpendSummary(bounded),
    merchantMetrics(bounded),
  ]);

  const clicks=funnel?.referrals.clicks||0;
  const conversions=funnel?.conversions.conversions||0;
  const commission=eurSummary.commissionEur;
  const conversionRate=clicks>0?conversions/clicks:null;
  const commissionPerClick=clicks>0?commission/clicks:null;
  const commissionPerConversion=conversions>0?commission/conversions:null;
  const paidConversions=paidAttribution.filter(x=>x.network!=="unattributed").reduce((s,x)=>s+Number(x.conversions||0),0);
  const paidCacEur=spend.spendEur>0&&paidConversions>0?spend.spendEur/paidConversions:null;
  const organicOrUnattributedConversions=Math.max(0,conversions-paidConversions);

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
      bookingValueEur:eurSummary.bookingValueEur,
      commissionEur:commission,
      settledCommissionEur:eurSummary.settledCommissionEur,
      takeRate:eurSummary.takeRate,
      conversionRate,
      commissionPerClickEur:commissionPerClick,
      commissionPerConversionEur:commissionPerConversion,
      funnel,
      acquisition,
      paidAttribution,
      paidSpendEur:spend.spendEur,
      paidConversions,
      paidCacEur,
      organicOrUnattributedConversions,
      merchant,
      currencyExposure,
    },
    unavailableUntilEvidence:{
      cac:paidCacEur===null?"CAC remains null until both paid spend and attributable conversions exist.":"Observed paid CAC is available above.",
      contributionMargin:"Merchant hotel cost and gross platform revenue are now observable; full contribution margin still requires payment, support, tax and infrastructure costs.",
      repeatRate:"Consumer identity/lifecycle persistence is not yet sufficient for a defensible repeat-rate claim.",
      directVsOtaMargin:merchant.paidOrders>0&&conversions>0?"Merchant and referral economics can now be compared from observed transactions.":"Requires both merchant orders and referral conversions.",
    },
    proofState:(conversions>0&&commission>0)||merchant.paidOrders>0?"COMMERCIAL_EVIDENCE_OBSERVED":"UNPROVEN",
    cashProofState:eurSummary.settledCommissionEur>0?"SETTLED_REVENUE_OBSERVED":"UNPROVEN",
  };
}
