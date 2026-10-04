import { heroExperimentReadout,type HeroExperimentReadout } from "@/src/db/growth";
import { getRuntimeConfig,setRuntimeConfig } from "@/src/db/runtime-config";
import type { HeroVariant } from "@/src/growth/experiments";

type HeroOverride={variant:HeroVariant;decidedAt:string;windowDays:number};

export const HERO_GUARDRAILS={
  minExposuresPerVariant:100,
  minWinnerReferrals:5,
  minAbsoluteReferralDelta:.01,
  minRelativeReferralUplift:.15,
  minConversionsPerVariant:3,
  minCommissionEurPerVariant:1,
  minSearchVisitorsPerVariant:30,
  maxZeroResultRegression:.05,
  maxRelativeConversionRegression:.10,
  maxRelativeCommissionPerExposureRegression:.10,
} as const;

function enriched(row:HeroExperimentReadout){
  return{
    ...row,
    referralRate:row.exposed_visitors?row.referral_visitors/row.exposed_visitors:0,
    conversionRate:row.exposed_visitors?row.conversion_visitors/row.exposed_visitors:0,
    commissionPerExposure:row.exposed_visitors?row.commission_eur/row.exposed_visitors:0,
    zeroResultRate:row.search_visitors?row.zero_result_visitors/row.search_visitors:null,
  };
}

export function evaluateHeroExperiment(rows:HeroExperimentReadout[]){
  if(rows.length<2)return{promote:false as const,reason:"insufficient-variants",rows};

  const eligible=rows
    .filter(x=>x.exposed_visitors>=HERO_GUARDRAILS.minExposuresPerVariant)
    .map(enriched)
    .sort((a,b)=>b.referralRate-a.referralRate);

  if(eligible.length<2)return{promote:false as const,reason:"insufficient-sample",rows};
  const [winner,runnerUp]=eligible;
  const absoluteDelta=winner.referralRate-runnerUp.referralRate;
  const relativeUplift=runnerUp.referralRate>0
    ?absoluteDelta/runnerUp.referralRate
    :(winner.referralRate>0?1:0);

  if(
    winner.referral_visitors<HERO_GUARDRAILS.minWinnerReferrals
    ||absoluteDelta<HERO_GUARDRAILS.minAbsoluteReferralDelta
    ||relativeUplift<HERO_GUARDRAILS.minRelativeReferralUplift
  ){
    return{promote:false as const,reason:"no-decisive-winner",rows,winner,runnerUp,absoluteDelta,relativeUplift};
  }

  if(
    winner.conversion_visitors<HERO_GUARDRAILS.minConversionsPerVariant
    ||runnerUp.conversion_visitors<HERO_GUARDRAILS.minConversionsPerVariant
  ){
    return{promote:false as const,reason:"insufficient-commercial-quality-sample",rows,winner,runnerUp,absoluteDelta,relativeUplift};
  }

  if(
    winner.commission_eur<HERO_GUARDRAILS.minCommissionEurPerVariant
    ||runnerUp.commission_eur<HERO_GUARDRAILS.minCommissionEurPerVariant
  ){
    return{promote:false as const,reason:"insufficient-revenue-quality-sample",rows,winner,runnerUp,absoluteDelta,relativeUplift};
  }

  if(
    runnerUp.conversionRate>0
    && winner.conversionRate<runnerUp.conversionRate*(1-HERO_GUARDRAILS.maxRelativeConversionRegression)
  ){
    return{promote:false as const,reason:"conversion-quality-guardrail",rows,winner,runnerUp,absoluteDelta,relativeUplift};
  }

  if(
    runnerUp.commissionPerExposure>0
    && winner.commissionPerExposure<runnerUp.commissionPerExposure*(1-HERO_GUARDRAILS.maxRelativeCommissionPerExposureRegression)
  ){
    return{promote:false as const,reason:"revenue-quality-guardrail",rows,winner,runnerUp,absoluteDelta,relativeUplift};
  }

  if(
    winner.search_visitors>=HERO_GUARDRAILS.minSearchVisitorsPerVariant
    && runnerUp.search_visitors>=HERO_GUARDRAILS.minSearchVisitorsPerVariant
    && winner.zeroResultRate!==null
    && runnerUp.zeroResultRate!==null
    && winner.zeroResultRate>runnerUp.zeroResultRate+HERO_GUARDRAILS.maxZeroResultRegression
  ){
    return{promote:false as const,reason:"search-quality-guardrail",rows,winner,runnerUp,absoluteDelta,relativeUplift};
  }

  if(!["freedom","provocation"].includes(winner.variant)){
    return{promote:false as const,reason:"unknown-variant",rows,winner,runnerUp};
  }

  return{promote:true as const,reason:"guardrails-pass",rows,winner,runnerUp,absoluteDelta,relativeUplift};
}

export async function getHeroOverride(){
  const value=await getRuntimeConfig<HeroOverride>("hero.override");
  return value&&["freedom","provocation"].includes(value.variant)?value:null;
}

export async function optimizeHeroExperiment(days=30){
  const rows=await heroExperimentReadout(days);
  const decision=evaluateHeroExperiment(rows);
  if(!decision.promote)return{changed:false,...decision};

  const winner=decision.winner;
  const current=await getHeroOverride();
  if(current?.variant===winner.variant)return{changed:false,reason:"winner-already-active",winner,current,decision};

  const value:HeroOverride={
    variant:winner.variant as HeroVariant,
    decidedAt:new Date().toISOString(),
    windowDays:days,
  };
  const persisted=await setRuntimeConfig({
    key:"hero.override",
    value,
    source:"growth-autopilot",
    evidence:{
      decision,
      thresholds:HERO_GUARDRAILS,
    },
  });
  return{changed:persisted,winner:value,evidence:decision};
}
