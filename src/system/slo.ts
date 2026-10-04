import { databaseHealth } from "@/src/db/client";
import { getOpsSnapshot } from "@/src/db/ops";
import { serviceOutcomeMetrics } from "@/src/db/observability";

export const SLO_TARGETS={
  availabilityPct:99.9,
  databaseProbeP95Ms:250,
  referralRedirectSuccessPct:99.5,
  conversionIngestSuccessPct:99.5,
  providerWaveSuccessPct:95,
  agentRunSuccessPct:95,
} as const;

export async function getSloSnapshot(){
  const [db,ops,serviceOutcomes]=await Promise.all([databaseHealth(),getOpsSnapshot(),serviceOutcomeMetrics(30)]);
  const recentRuns=ops.agentRuns;
  const completed=recentRuns.filter(x=>x.status==="COMPLETE").length;
  const failed=recentRuns.filter(x=>x.status==="FAILED").length;
  const agentSample=completed+failed;
  const agentSuccessPct=agentSample?completed/agentSample*100:null;

  const referralOutcome=serviceOutcomes.find(x=>x.action==="referral.redirect");
  const conversionOutcome=serviceOutcomes.find(x=>x.action==="conversion.ingest");

  const acquisitionSample=ops.acquisitionRuns.length;
  const acquisitionSuccess=ops.acquisitionRuns.filter(x=>x.status==="COMPLETE"&&x.errors===0).length;
  const providerWaveSuccessPct=acquisitionSample?acquisitionSuccess/acquisitionSample*100:null;

  return{
    generatedAt:new Date().toISOString(),
    targets:SLO_TARGETS,
    indicators:{
      database:{
        configured:db.configured,
        reachable:db.reachable,
        latencyMs:db.latencyMs,
        withinTarget:db.reachable&&typeof db.latencyMs==="number"?db.latencyMs<=SLO_TARGETS.databaseProbeP95Ms:null,
      },
      agentRuns:{sample:agentSample,successPct:agentSuccessPct,targetPct:SLO_TARGETS.agentRunSuccessPct},
      providerWaves:{sample:acquisitionSample,successPct:providerWaveSuccessPct,targetPct:SLO_TARGETS.providerWaveSuccessPct},
      referralRedirect:{
        sample:referralOutcome?.denominator||0,
        successPct:referralOutcome?.successPct??null,
        rejected:referralOutcome?.rejected||0,
        targetPct:SLO_TARGETS.referralRedirectSuccessPct,
      },
      conversionIngest:{
        sample:conversionOutcome?.denominator||0,
        successPct:conversionOutcome?.successPct??null,
        rejected:conversionOutcome?.rejected||0,
        targetPct:SLO_TARGETS.conversionIngestSuccessPct,
      },
      commercial:{
        liveOffers:ops.liveOffers,
        referralClicks30d:ops.referralClicks30d,
        conversions30d:ops.conversions30d,
      },
    },
    evidenceLimits:[
      "Availability, p95/p99 HTTP latency and real-user Core Web Vitals require platform analytics/observability.",
      "Referral and conversion success percentages remain null until durable request-outcome telemetry exists; policy rejections are reported separately and excluded from reliability denominators.",
      "Null percentages mean there is not enough observed production evidence; they are never imputed.",
    ],
  };
}
