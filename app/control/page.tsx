import { cookies } from "next/headers";
import { notFound } from "next/navigation";
import { OPS_COOKIE,verifyOpsSession } from "@/src/security/ops-session";
import { AGENTS } from "@/src/agents/registry";
import { liveProviderStatuses } from "@/src/providers/live/registry";
import { databaseHealth } from "@/src/db/client";
import { getOpsSnapshot } from "@/src/db/ops";
import { listOpenIncidents } from "@/src/db/governance";
import { growthFunnel,productFunnel,heroExperimentReadout,searchFriction } from "@/src/db/growth";
import { listAgentTasks } from "@/src/db/agent-tasks";
import { agentRuntimeCredentialsAvailable,agentRuntimeProvider } from "@/src/agents/llm";
import { getHeroOverride } from "@/src/growth/autopilot";
import { getSloSnapshot } from "@/src/system/slo";
import { getEconomicsSnapshot } from "@/src/system/economics";
import { agentRoleMetrics,providerErrorBudgets,runtimeDurationMetrics } from "@/src/db/observability";
import { deriveWeeklyOperatingScorecard } from "@/src/system/scorecard";

export const metadata={title:"Control Tower",robots:{index:false,follow:false}};

export default async function ControlTower(){
  const jar=await cookies();
  if(!verifyOpsSession(jar.get(OPS_COOKIE)?.value)) notFound();

  const providers=liveProviderStatuses();
  const [ops,incidents,funnel,product,heroExperiment,friction,agentTasks,heroOverride,dbHealth,agentCredentials,slo,economics,agentMetrics,providerBudgets,durationMetrics]=await Promise.all([
    getOpsSnapshot(),
    listOpenIncidents(20),
    growthFunnel(30),
    productFunnel(30),
    heroExperimentReadout(30),
    searchFriction(30),
    listAgentTasks(30),
    getHeroOverride(),
    databaseHealth(),
    agentRuntimeCredentialsAvailable(),
    getSloSnapshot(),
    getEconomicsSnapshot(30),
    agentRoleMetrics(30),
    providerErrorBudgets(30),
    runtimeDurationMetrics(30),
  ]);
  const db=dbHealth.reachable;
  const agentConfigured=agentCredentials&&process.env.AGENT_RUNTIME_ENABLED!=="false";
  const scorecard=deriveWeeklyOperatingScorecard({
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

  return <main className="controlPage">
    <div className="shell">
      <a href="/" className="eyebrow" style={{color:"#0a1630"}}>← consumer experience</a>
      <h1>CONTROL TOWER 3.0</h1>
      <p style={{color:"#91a0b8",maxWidth:820}}>Private operating plane. Runtime truth, deterministic autopilots and governed agent actions are separated from external commercial proof.</p>

      <div className="metrics">
        <div className="metricDark"><b className={db?"green":"amber"}>{db?"ONLINE":"OFFLINE"}</b><span>database</span></div>
        <div className="metricDark"><b className={agentConfigured?"green":"amber"}>{agentConfigured?"ONLINE":"OFFLINE"}</b><span>{agentRuntimeProvider()} agent runtime</span></div>
        <div className="metricDark"><b className={ops.liveOffers?"green":"amber"}>{ops.liveOffers}</b><span>SELLABLE live offers · {ops.providerLiveOffers} provider + {ops.directLiveOffers} direct</span></div>
        <div className="metricDark"><b>{ops.referralClicks30d}</b><span>referral clicks · 30d</span></div>
        <div className="metricDark"><b>€{Math.round(ops.commission30d).toLocaleString("en-US")}</b><span>commission EUR · 30d</span></div>
      </div>

      <h2 style={{marginTop:36}}>Weekly operating scorecard</h2>
      <div className="metrics">
        <div className="metricDark"><b>{scorecard.score.pct}%</b><span>evidence-weighted operating score · 7d</span></div>
        <div className="metricDark"><b className={scorecard.dimensions.runtime.state==="PASS"?"green":"amber"}>{scorecard.dimensions.runtime.state}</b><span>runtime</span></div>
        <div className="metricDark"><b className={scorecard.dimensions.supply.state==="PASS"?"green":"amber"}>{scorecard.dimensions.supply.state}</b><span>supply</span></div>
        <div className="metricDark"><b className={scorecard.dimensions.money.state==="PASS"?"green":"amber"}>{scorecard.dimensions.money.state}</b><span>money loop</span></div>
        <div className="metricDark"><b>{scorecard.openIncidents}</b><span>open incidents</span></div>
      </div>
      <div className="table">
        {scorecard.priorities.length?scorecard.priorities.map((priority,i)=><div className="tr" key={priority}><b>{String(i+1).padStart(2,"0")}</b><span>PRIORITY</span><span>7d</span><span>{priority}</span></div>):<div className="tr"><b>01</b><span className="green">CLEAR</span><span>7d</span><span>No evidence-backed weekly priority.</span></div>}
      </div>

      <h2 style={{marginTop:36}}>Runtime SLOs</h2>
      <div className="metrics">
        <div className="metricDark">
          <b className={dbHealth.reachable&&slo.indicators.database.withinTarget!==false?"green":"amber"}>
            {dbHealth.reachable?String(dbHealth.latencyMs)+" ms":"OFFLINE"}
          </b>
          <span>database probe · target ≤ {slo.targets.databaseProbeP95Ms} ms</span>
        </div>
        <div className="metricDark">
          <b>{slo.indicators.agentRuns.successPct===null?"NO SAMPLE":slo.indicators.agentRuns.successPct.toFixed(1)+"%"}</b>
          <span>agent success · target {slo.targets.agentRunSuccessPct}%</span>
        </div>
        <div className="metricDark">
          <b>{slo.indicators.providerWaves.successPct===null?"NO SAMPLE":slo.indicators.providerWaves.successPct.toFixed(1)+"%"}</b>
          <span>provider-wave success · target {slo.targets.providerWaveSuccessPct}%</span>
        </div>
        <div className="metricDark">
          <b>{slo.indicators.referralRedirect.successPct===null?"NO SAMPLE":slo.indicators.referralRedirect.successPct.toFixed(1)+"%"}</b>
          <span>referral redirect · target {slo.targets.referralRedirectSuccessPct}% · {slo.indicators.referralRedirect.rejected} rejected</span>
        </div>
        <div className="metricDark">
          <b>{slo.indicators.conversionIngest.successPct===null?"NO SAMPLE":slo.indicators.conversionIngest.successPct.toFixed(1)+"%"}</b>
          <span>conversion ingest · target {slo.targets.conversionIngestSuccessPct}% · {slo.indicators.conversionIngest.rejected} rejected</span>
        </div>
        <div className="metricDark">
          <b className={economics.proofState==="COMMERCIAL_EVIDENCE_OBSERVED"?"green":"amber"}>{economics.proofState}</b>
          <span>commercial evidence</span>
        </div>
      </div>

      <h2 style={{marginTop:36}}>AI runtime by role · 30d</h2>
      <div className="table">
        <div className="tr"><b>Role</b><b>Actor → judge</b><b>Runs / tokens</b><b>Observed cost</b></div>
        {agentMetrics.length?agentMetrics.map((m,i)=><div className="tr" key={m.agentKey+":"+m.actorModel+":"+m.judgeModel+":"+i}>
          <b>{m.agentKey}</b>
          <span>{m.actorProvider}/{m.actorModel} → {m.judgeProvider}/{m.judgeModel}</span>
          <span>{m.runs} runs · {m.totalTokens.toLocaleString()} tokens · {m.failed} failed</span>
          <span>€{(m.costCents/100).toFixed(2)}</span>
        </div>):<div className="tr"><b>No persisted AI sample</b><span>—</span><span>0</span><span>DB/runtime evidence required</span></div>}
      </div>

      <h2 style={{marginTop:36}}>Provider error budgets · 30d</h2>
      <div className="table">
        <div className="tr"><b>Provider</b><b>Success</b><b>Error budget</b><b>Evidence</b></div>
        {providerBudgets.length?providerBudgets.map(p=><div className="tr" key={p.provider}>
          <b>{p.provider}</b>
          <span>{p.successPct===null?"NO SAMPLE":p.successPct.toFixed(1)+"%"}</span>
          <span>{p.remainingFailureBudgetPct===null?"—":p.remainingFailureBudgetPct.toFixed(1)+"pp remaining"}</span>
          <span>{p.cleanRuns}/{p.runs} clean runs</span>
        </div>):<div className="tr"><b>No acquisition sample</b><span>NO SAMPLE</span><span>—</span><span>provider waves required</span></div>}
      </div>

      <h2 style={{marginTop:36}}>Observed runtime duration · 30d</h2>
      <div className="table">
        <div className="tr"><b>Runtime</b><b>p50 / p95</b><b>Max</b><b>Failure / retries</b></div>
        {durationMetrics.length?durationMetrics.map(m=><div className="tr" key={m.kind}>
          <b>{m.kind}</b>
          <span>{m.p50Ms===null?"NO SAMPLE":m.p50Ms+" ms"} / {m.p95Ms===null?"NO SAMPLE":m.p95Ms+" ms"}</span>
          <span>{m.maxMs===null?"—":m.maxMs+" ms"} · {m.sample} completed</span>
          <span>{m.failed} failed · engine retries NOT EXPOSED</span>
        </div>):<div className="tr"><b>No duration sample</b><span>NO SAMPLE</span><span>—</span><span>DB/runtime evidence required</span></div>}
      </div>

      <h2 style={{marginTop:36}}>Observed economics · 30d</h2>
      <div className="metrics">
        <div className="metricDark"><b>{economics.observed.referralClicks}</b><span>referral clicks</span></div>
        <div className="metricDark"><b>{economics.observed.conversions}</b><span>conversions</span></div>
        <div className="metricDark"><b>{economics.observed.conversionRate===null?"—":(economics.observed.conversionRate*100).toFixed(2)+"%"}</b><span>click → conversion</span></div>
        <div className="metricDark"><b>€{economics.observed.bookingValueEur.toFixed(2)}</b><span>booking value · EUR evidence only</span></div>
        <div className="metricDark"><b>€{economics.observed.commissionEur.toFixed(2)}</b><span>confirmed commission · EUR</span></div>
        <div className="metricDark"><b>{economics.observed.takeRate===null?"—":(economics.observed.takeRate*100).toFixed(2)+"%"}</b><span>observed take rate</span></div>
        <div className="metricDark"><b>€{economics.observed.settledCommissionEur.toFixed(2)}</b><span>settled commission · {economics.cashProofState}</span></div>
        <div className="metricDark"><b>{economics.observed.commissionPerConversionEur===null?"—":"€"+economics.observed.commissionPerConversionEur.toFixed(2)}</b><span>commission / conversion</span></div>
      </div>

      <div className="table" style={{marginTop:18}}>
        <div className="tr"><b>Currency</b><b>Status</b><b>Booking value</b><b>Commission</b></div>
        {economics.observed.currencyExposure.length?economics.observed.currencyExposure.map((row,i)=><div className="tr" key={row.currency+":"+row.status+":"+i}>
          <b>{row.currency}</b><span>{row.status} · {row.count} conversion(s)</span><span>{row.bookingValue.toFixed(2)} {row.currency}</span><span>{row.commission.toFixed(2)} {row.currency}</span>
        </div>):<div className="tr"><b>No currency exposure</b><span>NO SAMPLE</span><span>—</span><span>Reporting currency: {economics.reportingCurrency}</span></div>}
      </div>
      <p style={{color:"#91a0b8",fontSize:12}}>FX policy {economics.fxPolicy.version}: {economics.fxPolicy.rule}</p>

      <h2 style={{marginTop:36}}>Open incidents</h2>
      <div className="table">
        {incidents.length?incidents.map(i=><div className="tr" key={i.key}>
          <b>{i.key}</b><span className={i.severity==="critical"?"amber":""}>{i.severity.toUpperCase()}</span><span>{i.occurrences}×</span><span>{i.message}</span>
        </div>):<div className="tr"><b>No open incidents</b><span className="green">CLEAR</span><span>0</span><span>Daily Control will reopen a signal if it recurs.</span></div>}
      </div>

      <h2 style={{marginTop:36}}>Real hotel product funnel · 30d</h2>
      <div className="metrics">
        <div className="metricDark"><b>{product?.pageSessions||0}</b><span>consented page sessions</span></div>
        <div className="metricDark"><b>{product?.searchSessions||0}</b><span>search sessions · {product?.aiSearchSessions||0} AI</span></div>
        <div className="metricDark"><b>{product?.resultSessions||0}</b><span>sessions with results</span></div>
        <div className="metricDark"><b>{product?.impressionSessions||0}</b><span>hotel impression sessions</span></div>
        <div className="metricDark"><b>{product?.hotelEngagementSessions||0}</b><span>card / map / official-site engagement</span></div>
        <div className="metricDark"><b>{product?.savedSessions||0}</b><span>save sessions</span></div>
        <div className="metricDark"><b>{product?.sourcingSuccessSessions||0}/{product?.sourcingStartSessions||0}</b><span>successful / started rate sourcing</span></div>
        <div className="metricDark"><b>{product?.referralSessions||0}</b><span>commercial referral sessions</span></div>
        <div className="metricDark"><b>{product?.conversionSessions||0}</b><span>converted sessions</span></div>
      </div>
      <div className="table">
        <div className="tr"><b>Search → results</b><b>Results → hotel action</b><b>Hotel action → sourcing</b><b>Referral → conversion</b></div>
        <div className="tr">
          <span>{product?.searchToResults===null||product?.searchToResults===undefined?"—":(product.searchToResults*100).toFixed(1)+"%"}</span>
          <span>{product?.resultsToEngagement===null||product?.resultsToEngagement===undefined?"—":(product.resultsToEngagement*100).toFixed(1)+"%"}</span>
          <span>{product?.engagementToSourcing===null||product?.engagementToSourcing===undefined?"—":(product.engagementToSourcing*100).toFixed(1)+"%"}</span>
          <span>{product?.referralToConversion===null||product?.referralToConversion===undefined?"—":(product.referralToConversion*100).toFixed(1)+"%"}</span>
        </div>
        <div className="tr"><b>Card CTR</b><b>Map CTR</b><b>Save rate</b><b>Sourcing completion</b></div>
        <div className="tr">
          <span>{product?.cardCtr===null||product?.cardCtr===undefined?"—":(product.cardCtr*100).toFixed(1)+"%"}</span>
          <span>{product?.mapCtr===null||product?.mapCtr===undefined?"—":(product.mapCtr*100).toFixed(1)+"%"}</span>
          <span>{product?.saveRate===null||product?.saveRate===undefined?"—":(product.saveRate*100).toFixed(1)+"%"}</span>
          <span>{product?.sourcingCompletionRate===null||product?.sourcingCompletionRate===undefined?"—":(product.sourcingCompletionRate*100).toFixed(1)+"%"}</span>
        </div>
        <div className="tr"><b>AI → hotel action</b><b>Manual → hotel action</b><b>Verified click share</b><b>Sourcing start rate</b></div>
        <div className="tr">
          <span>{product?.aiToEngagement===null||product?.aiToEngagement===undefined?"—":(product.aiToEngagement*100).toFixed(1)+"%"} · {product?.aiSearchSessions||0} AI sessions</span>
          <span>{product?.manualToEngagement===null||product?.manualToEngagement===undefined?"—":(product.manualToEngagement*100).toFixed(1)+"%"} · {product?.manualOnlySearchSessions||0} manual-only</span>
          <span>{product?.verifiedCardClickShare===null||product?.verifiedCardClickShare===undefined?"—":(product.verifiedCardClickShare*100).toFixed(1)+"%"}</span>
          <span>{product?.sourcingStartRate===null||product?.sourcingStartRate===undefined?"—":(product.sourcingStartRate*100).toFixed(1)+"%"}</span>
        </div>
      </div>

      <h2 style={{marginTop:36}}>Growth autopilot · 30d</h2>
      <div className="metrics">
        <div className="metricDark"><b>{funnel?.events.find(x=>x.event_name==="planner_loaded")?.visitors||0}</b><span>planner visitors</span></div>
        <div className="metricDark"><b>{funnel?.events.find(x=>x.event_name==="hero_search")?.visitors||0}</b><span>search visitors</span></div>
        <div className="metricDark"><b>{funnel?.referrals.visitors||0}</b><span>referral visitors</span></div>
        <div className="metricDark"><b>{funnel?.conversions.visitors||0}</b><span>converted visitors</span></div>
        <div className="metricDark"><b>{friction?.zeroResultRate===null||friction?.zeroResultRate===undefined?"—":(friction.zeroResultRate*100).toFixed(1)+"%"}</b><span>search sessions with zero results</span></div>
        <div className="metricDark"><b>{friction?.abandonmentRate===null||friction?.abandonmentRate===undefined?"—":(friction.abandonmentRate*100).toFixed(1)+"%"}</b><span>trackable search sessions without referral</span></div>
        <div className="metricDark"><b>{friction?.referralSessions||0}/{friction?.trackableSessions||0}</b><span>search sessions linked to referral</span></div>
        <div className="metricDark"><b className={heroOverride?"green":""}>{heroOverride?.variant||"LEARNING"}</b><span>deterministic hero override</span></div>
      </div>
      <div className="table">
        <div className="tr"><b>Hero variant</b><b>Exposed</b><b>Referral rate</b><b>Commercial / search quality</b></div>
        {heroExperiment.length?heroExperiment.map(x=><div className="tr" key={x.variant}>
          <b>{x.variant}</b>
          <span>{x.exposed_visitors}</span>
          <span>{x.exposed_visitors?((x.referral_visitors/x.exposed_visitors)*100).toFixed(1)+"%":"—"} · {x.referral_visitors} visitors</span>
          <span>{x.conversion_visitors} converted · €{x.commission_eur.toFixed(2)} · zero-result {x.search_visitors?((x.zero_result_visitors/x.search_visitors)*100).toFixed(1)+"%":"—"}</span>
        </div>):<div className="tr"><b>No experiment data yet</b><span>—</span><span>—</span><span>consent-gated learning</span></div>}
      </div>

      <h2 style={{marginTop:36}}>Provider readiness</h2>
      <div className="table">
        <div className="tr"><b>Provider</b><b>Environment</b><b>Configured</b><b>Commercial gate</b></div>
        {providers.map(p=><div className="tr" key={p.provider}>
          <b>{p.provider}</b><span>{p.environment}</span><span className={p.configured?"green":"amber"}>{p.configured?"YES":"NO"}</span><span>{p.configured?"eligible for live probes":"optional; direct hotel supply can launch independently"}</span>
        </div>)}
      </div>

      <h2 style={{marginTop:36}}>Recent acquisition waves</h2>
      <div className="table">
        {ops.acquisitionRuns.length?ops.acquisitionRuns.map(r=><div className="tr" key={r.waveKey+r.startedAt}>
          <b>{r.waveKey}</b><span>{r.provider||"multi"}</span><span className={r.status==="COMPLETE"?"green":"amber"}>{r.status}</span><span>{r.sellable} sellable · {r.errors} errors</span>
        </div>):<div className="tr"><b>No persisted waves yet</b><span>DB {db?"online":"offline"}</span><span className="amber">WAITING</span><span>Direct contracts or provider waves will appear here.</span></div>}
      </div>

      <h2 style={{marginTop:36}}>Autonomous workforce</h2>
      <div className="table">
        {Object.values(AGENTS).map(a=><div className="tr" key={a.key}>
          <b>{a.key}</b><span>{a.reduces}</span><span>{a.requiredJudges.join(", ")}</span><span className="amber">€{a.maxExternalSpendEur} declared authority</span>
        </div>)}
      </div>

      <h2 style={{marginTop:36}}>Agent action ledger</h2>
      <div className="table">
        {agentTasks.length?agentTasks.map(t=><div className="tr" key={t.id}>
          <b>{t.agentKey}</b><span>{t.actionKind||t.sourceSignal}</span><span className={t.status==="PROPOSED"?"amber":"green"}>{t.status}</span><span>{t.executionState} · {t.objective}</span>
        </div>):<div className="tr"><b>No agent actions yet</b><span>—</span><span className="green">CLEAR</span><span>Safe allowlisted actions auto-execute; material actions remain proposals.</span></div>}
      </div>

      <h2 style={{marginTop:36}}>Recent agent runs</h2>
      <div className="table">
        {ops.agentRuns.length?ops.agentRuns.map(r=><div className="tr" key={r.agentKey+r.startedAt}>
          <b>{r.agentKey}</b><span>{r.status}</span><span>{r.costCents===null?"—":"€"+(r.costCents/100).toFixed(2)}</span><span>{r.completedAt||"running"}</span>
        </div>):<div className="tr"><b>No persisted agent runs yet</b><span>{agentConfigured?"runtime armed":"runtime offline"}</span><span className="amber">WAITING</span><span>Durable runs require the database.</span></div>}
      </div>

      <h2 style={{marginTop:36}}>Human authority boundary</h2>
      <div className="metrics">
        <div className="metricDark"><b>AUTO</b><span>read-only audits + idempotent reconciliation</span></div>
        <div className="metricDark"><b>HUMAN</b><span>prices, contracts, outreach, paid spend, code changes</span></div>
        <div className="metricDark"><b>0</b><span>agents allowed to sign contracts</span></div>
        <div className="metricDark"><b>{Object.keys(AGENTS).length}</b><span>bounded agent roles</span></div>
        <div className="metricDark"><b>{ops.conversions30d}</b><span>conversions · 30d</span></div>
      </div>
    </div>
  </main>;
}
