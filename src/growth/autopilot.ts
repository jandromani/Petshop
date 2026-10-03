import { heroExperimentReadout } from "@/src/db/growth";
import { getRuntimeConfig,setRuntimeConfig } from "@/src/db/runtime-config";
import type { HeroVariant } from "@/src/growth/experiments";

type HeroOverride={variant:HeroVariant;decidedAt:string;windowDays:number};

export async function getHeroOverride(){
  const value=await getRuntimeConfig<HeroOverride>("hero.override");
  return value&&["freedom","provocation"].includes(value.variant)?value:null;
}

export async function optimizeHeroExperiment(days=30){
  const rows=await heroExperimentReadout(days);
  if(rows.length<2)return{changed:false,reason:"insufficient-variants",rows};
  const eligible=rows
    .filter(x=>x.exposed_visitors>=100)
    .map(x=>({...x,rate:x.exposed_visitors?x.referral_visitors/x.exposed_visitors:0}))
    .sort((a,b)=>b.rate-a.rate);
  if(eligible.length<2)return{changed:false,reason:"insufficient-sample",rows};
  const [winner,runnerUp]=eligible;
  const absoluteDelta=winner.rate-runnerUp.rate;
  const relativeUplift=runnerUp.rate>0?absoluteDelta/runnerUp.rate:(winner.rate>0?1:0);
  if(winner.referral_visitors<5||absoluteDelta<0.01||relativeUplift<0.15){
    return{changed:false,reason:"no-decisive-winner",rows,absoluteDelta,relativeUplift};
  }
  if(!["freedom","provocation"].includes(winner.variant))return{changed:false,reason:"unknown-variant",rows};
  const current=await getHeroOverride();
  if(current?.variant===winner.variant)return{changed:false,reason:"winner-already-active",winner,current};
  const value:HeroOverride={variant:winner.variant as HeroVariant,decidedAt:new Date().toISOString(),windowDays:days};
  const persisted=await setRuntimeConfig({
    key:"hero.override",value,source:"growth-autopilot",
    evidence:{rows,absoluteDelta,relativeUplift,thresholds:{minExposuresPerVariant:100,minWinnerReferrals:5,minAbsoluteDelta:.01,minRelativeUplift:.15}},
  });
  return{changed:persisted,winner:value,evidence:{rows,absoluteDelta,relativeUplift}};
}
