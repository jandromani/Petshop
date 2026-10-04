import { getSloSnapshot } from "@/src/system/slo";
import { getEconomicsSnapshot } from "@/src/system/economics";
import { searchFriction } from "@/src/db/growth";
import { listOpenIncidents } from "@/src/db/governance";

export type ScoreState="PASS"|"WATCH"|"BLOCKED"|"NO_SAMPLE";

export type WeeklyScorecardInput={
  dbReachable:boolean;
  dbWithinTarget:boolean|null;
  liveOffers:number;
  providerWaveSuccessPct:number|null;
  agentSuccessPct:number|null;
  referralClicks:number;
  conversions:number;
  commissionEur:number;
  proofState:string;
  zeroResultRate:number|null;
  abandonmentRate:number|null;
  openIncidents:number;
};

function observedState(value:number|null,target:number,comparison:"gte"|"lte"="gte"):ScoreState{
  if(value===null)return"NO_SAMPLE";
  const pass=comparison==="gte"?value>=target:value<=target;
  return pass?"PASS":"WATCH";
}

export function deriveWeeklyOperatingScorecard(input:WeeklyScorecardInput){
  const runtime:ScoreState=!input.dbReachable
    ?"BLOCKED"
    :input.dbWithinTarget===false?"WATCH":"PASS";
  const supply:ScoreState=input.liveOffers>0
    ?observedState(input.providerWaveSuccessPct,95)
    :"BLOCKED";
  const demand:ScoreState=input.referralClicks>0?"PASS":"NO_SAMPLE";
  const money:ScoreState=input.proofState==="COMMERCIAL_EVIDENCE_OBSERVED"&&input.conversions>0&&input.commissionEur>0
    ?"PASS":"NO_SAMPLE";
  const automation=observedState(input.agentSuccessPct,95);
  const searchQuality:ScoreState=input.zeroResultRate===null
    ?"NO_SAMPLE"
    :input.zeroResultRate<=.2?"PASS":"WATCH";

  const priorities:string[]=[];
  if(runtime==="BLOCKED")priorities.push("Activate and verify the persistent database.");
  if(supply==="BLOCKED")priorities.push("Onboard verified SELLABLE supply.");
  if(searchQuality==="WATCH")priorities.push("Reduce zero-result search demand mismatch.");
  if(input.abandonmentRate!==null&&input.abandonmentRate>.8)priorities.push("Investigate high search-to-referral abandonment.");
  if(money==="NO_SAMPLE")priorities.push("Close the first reconciled conversion-to-settlement loop.");
  if(input.openIncidents>0)priorities.push("Resolve open operational incidents.");

  const states=[runtime,supply,demand,money,automation,searchQuality];
  const score=states.reduce((sum,state)=>sum+(state==="PASS"?1:state==="WATCH"?.5:0),0);
  const maxScore=states.length;

  return{
    windowDays:7,
    generatedAt:new Date().toISOString(),
    northStar:"confirmed long-stay bookings with traceable referral evidence",
    score:{points:score,maxPoints:maxScore,pct:Math.round(score/maxScore*100)},
    dimensions:{
      runtime:{state:runtime,dbReachable:input.dbReachable,dbWithinTarget:input.dbWithinTarget},
      supply:{state:supply,liveOffers:input.liveOffers,providerWaveSuccessPct:input.providerWaveSuccessPct},
      demand:{state:demand,referralClicks:input.referralClicks},
      money:{state:money,conversions:input.conversions,commissionEur:input.commissionEur},
      automation:{state:automation,agentSuccessPct:input.agentSuccessPct},
      searchQuality:{state:searchQuality,zeroResultRate:input.zeroResultRate,abandonmentRate:input.abandonmentRate},
    },
    openIncidents:input.openIncidents,
    priorities,
    evidenceRule:"NO_SAMPLE is never promoted to PASS. External commercial proof remains external.",
  };
}

export async function getWeeklyOperatingScorecard(){
  const [slo,economics,friction,incidents]=await Promise.all([
    getSloSnapshot(),
    getEconomicsSnapshot(7),
    searchFriction(7),
    listOpenIncidents(100),
  ]);
  return deriveWeeklyOperatingScorecard({
    dbReachable:slo.indicators.database.reachable,
    dbWithinTarget:slo.indicators.database.withinTarget,
    liveOffers:economics.observed.liveOffers,
    providerWaveSuccessPct:slo.indicators.providerWaves.successPct,
    agentSuccessPct:slo.indicators.agentRuns.successPct,
    referralClicks:economics.observed.referralClicks,
    conversions:economics.observed.conversions,
    commissionEur:economics.observed.commissionEur,
    proofState:economics.proofState,
    zeroResultRate:friction?.zeroResultRate??null,
    abandonmentRate:friction?.abandonmentRate??null,
    openIncidents:incidents.length,
  });
}
