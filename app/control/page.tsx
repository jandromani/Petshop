import { cookies } from "next/headers";
import { notFound } from "next/navigation";
import { OPS_COOKIE,verifyOpsSession } from "@/src/security/ops-session";
import { AGENTS } from "@/src/agents/registry";
import { liveProviderStatuses } from "@/src/providers/live/registry";
import { databaseHealth } from "@/src/db/client";
import { getOpsSnapshot } from "@/src/db/ops";
import { listOpenIncidents } from "@/src/db/governance";
import { growthFunnel,heroExperimentReadout,searchFriction } from "@/src/db/growth";
import { listAgentTasks } from "@/src/db/agent-tasks";
import { agentRuntimeCredentialsAvailable,agentRuntimeProvider } from "@/src/agents/llm";
import { getHeroOverride } from "@/src/growth/autopilot";
import { getSloSnapshot } from "@/src/system/slo";
import { getEconomicsSnapshot } from "@/src/system/economics";
import { getWeeklyOperatingScorecard } from "@/src/system/scorecard";

export const metadata={title:"Control Tower",robots:{index:false,follow:false}};

export default async function ControlTower(){
  const jar=await cookies();
  if(!verifyOpsSession(jar.get(OPS_COOKIE)?.value)) notFound();

  const providers=liveProviderStatuses();
  const [ops,incidents,funnel,heroExperiment,friction,agentTasks,heroOverride,dbHealth,agentCredentials,slo,economics,scorecard]=await Promise.all([
    getOpsSnapshot(),
    listOpenIncidents(20),
    growthFunnel(30),
    heroExperimentReadout(30),
    searchFriction(30),
    listAgentTasks(30),
    getHeroOverride(),
    databaseHealth(),
    agentRuntimeCredentialsAvailable(),
    getSloSnapshot(),
    getEconomicsSnapshot(30),
    getWeeklyOperatingScorecard(),
  ]);
  const db=dbHealth.reachable;
  const agentConfigured=agentCredentials&&process.env.AGENT_RUNTIME_ENABLED!=="false";

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
          <b className={economics.proofState==="COMMERCIAL_EVIDENCE_OBSERVED"?"green":"amber"}>{economics.proofState}</b>
          <span>commercial evidence</span>
        </div>
      </div>

      <h2 style={{marginTop:36}}>Observed economics · 30d</h2>
      <div className="metrics">
        <div className="metricDark"><b>{economics.observed.referralClicks}</b><span>referral clicks</span></div>
        <div className="metricDark"><b>{economics.observed.conversions}</b><span>conversions</span></div>
        <div className="metricDark"><b>{economics.observed.conversionRate===null?"—":(economics.observed.conversionRate*100).toFixed(2)+"%"}</b><span>click → conversion</span></div>
        <div className="metricDark"><b>€{economics.observed.commissionEur.toFixed(2)}</b><span>observed commission</span></div>
        <div className="metricDark"><b>{economics.observed.commissionPerConversionEur===null?"—":"€"+economics.observed.commissionPerConversionEur.toFixed(2)}</b><span>commission / conversion</span></div>
      </div>

      <h2 style={{marginTop:36}}>Open incidents</h2>
      <div className="table">
        {incidents.length?incidents.map(i=><div className="tr" key={i.key}>
          <b>{i.key}</b><span className={i.severity==="critical"?"amber":""}>{i.severity.toUpperCase()}</span><span>{i.occurrences}×</span><span>{i.message}</span>
        </div>):<div className="tr"><b>No open incidents</b><span className="green">CLEAR</span><span>0</span><span>Daily Control will reopen a signal if it recurs.</span></div>}
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
        <div className="tr"><b>Hero variant</b><b>Exposed visitors</b><b>Referral visitors</b><b>Observed referral rate</b></div>
        {heroExperiment.length?heroExperiment.map(x=><div className="tr" key={x.variant}>
          <b>{x.variant}</b><span>{x.exposed_visitors}</span><span>{x.referral_visitors}</span><span>{x.exposed_visitors?((x.referral_visitors/x.exposed_visitors)*100).toFixed(1)+"%":"—"}</span>
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
