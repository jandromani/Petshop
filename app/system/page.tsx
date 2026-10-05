import { getSystemReadiness } from "@/src/system/readiness";
import { activationManifest } from "@/src/system/activation";

export const metadata={title:"System proof",robots:{index:false,follow:false}};

const cls=(state:string)=>state==="LIVE"||state==="READY"?"green":state==="WAITING_EXTERNAL"?"amber":"";

export default async function SystemPage(){
  const [status,activation]=await Promise.all([getSystemReadiness(),activationManifest()]);
  const sourcingEmailConfigured=Boolean(process.env.RESEND_API_KEY?.trim()&&process.env.ATLAS_EMAIL_FROM?.trim());
  const layers=[
    ["01","EXPERIENCE / GROWTH",status.layers.experience],
    ["02","SUPPLY / TRUTH",status.layers.supply],
    ["03","MONEY / REFERRAL",status.layers.money],
    ["04","AUTONOMOUS OPS",status.layers.autonomy],
  ] as const;

  return <main className="controlPage">
    <div className="shell">
      <a className="eyebrow" style={{color:"#0a1630"}} href="/">← consumer product</a>
      <h1>FULL SYSTEM PROOF</h1>
      <p style={{color:"#91a0b8",maxWidth:820}}>LIVE means external runtime evidence exists. READY means the software path is implemented and waiting for activation or real traffic. The deterministic circuit below is explicitly synthetic and never substitutes for commercial proof.</p>

      <div className="metrics" style={{marginTop:28}}>
        {layers.map(([n,name,layer])=><div className="metricDark" key={name}>
          <span>{n} · {name}</span>
          <b className={cls(layer.state)}>{layer.state}</b>
          <span>{layer.score}% readiness</span>
        </div>)}
      </div>

      <div className="table" style={{marginTop:26}}>
        {layers.map(([n,name,layer])=><div className="tr" key={name}>
          <b>{n} · {name}</b><span className={cls(layer.state)}>{layer.state}</span><span>{layer.score}%</span><span>{layer.detail}</span>
        </div>)}
      </div>

      <h2 style={{marginTop:38}}>Activation manifest</h2>
      <div className="table">
        {activation.items.map(item=><div className="tr" key={item.key}>
          <b>{item.key}</b><span className={item.state==="ACTIVE"?"green":item.state==="ACTIVATION_REQUIRED"?"amber":""}>{item.state}</span><span>{item.detail}</span><span>{item.state==="ACTIVE"?"operational":item.state==="READY"?"armed":"explicit external gate"}</span>
        </div>)}
      </div>

      <h2 style={{marginTop:38}}>Infrastructure truth</h2>
      <div className="metrics">
        <div className="metricDark"><b className={status.infrastructure.productionObserved?"green":"amber"}>{status.infrastructure.productionObserved?"OBSERVED":"NOT OBSERVED"}</b><span>production runtime</span></div>
        <div className="metricDark"><b className={status.infrastructure.databaseConfigured?"green":"amber"}>{status.infrastructure.databaseConfigured?"ONLINE":"NOT CONNECTED"}</b><span>persistent database</span></div>
        <div className="metricDark"><b className={status.infrastructure.agentConfigured?"green":"amber"}>{status.infrastructure.agentConfigured?"ONLINE":"NOT ACTIVE"}</b><span>{status.infrastructure.agentRuntimeProvider} agent runtime</span></div>
        <div className="metricDark"><b>{status.infrastructure.configuredProviders.length}/3</b><span>optional OTA providers configured</span></div>
        <div className="metricDark"><b>{status.ops.liveOffers}</b><span>truth-gated live offers</span></div>
        <div className="metricDark"><b className={status.infrastructure.merchantCheckout.enabled&&status.infrastructure.merchantCheckout.stripeConfigured&&status.infrastructure.merchantCheckout.webhookConfigured?"green":"amber"}>{status.infrastructure.merchantCheckout.enabled?"ARMED":"OFF"}</b><span>Atlas Checkout config</span></div>
        <div className="metricDark"><b className={sourcingEmailConfigured?"green":"amber"}>{sourcingEmailConfigured?"ACTIVE":"OPS QUEUE"}</b><span>sourcing quote email delivery</span></div>
      </div>

      <h2 style={{marginTop:38}}>Managed marketplace proof</h2>
      <p style={{color:"#91a0b8",maxWidth:820}}>These are runtime counts, not pitch-deck targets. Zero stays zero until contracted managed supply and paid orders actually exist.</p>
      <div className="metrics">
        <div className="metricDark"><b>{status.infrastructure.merchantCheckout.liveRates}</b><span>live merchant rates</span></div>
        <div className="metricDark"><b>{status.infrastructure.merchantCheckout.availableUnits}</b><span>available allocated units</span></div>
        <div className="metricDark"><b>{status.infrastructure.merchantCheckout.paidOrders30d}</b><span>paid Atlas orders · 30d</span></div>
        <div className="metricDark"><b>€{Math.round(status.infrastructure.merchantCheckout.gmv30d).toLocaleString("en-US")}</b><span>merchant GMV · 30d</span></div>
        <div className="metricDark"><b>€{Math.round(status.infrastructure.merchantCheckout.platformRevenue30d).toLocaleString("en-US")}</b><span>gross platform revenue · 30d</span></div>
        <div className="metricDark"><b>{status.infrastructure.merchantCheckout.takeRate30d===null?"—":(status.infrastructure.merchantCheckout.takeRate30d*100).toFixed(1)+"%"}</b><span>observed merchant take rate</span></div>
      </div>

      <h2 style={{marginTop:38}}>Synthetic deterministic circuit</h2>
      <p style={{color:"#91a0b8"}}>{status.proof.proves}</p>
      <div className="table">
        {status.proof.checks.map(check=><div className="tr" key={check.name}>
          <b>{check.name}</b><span className={check.pass?"green":""}>{check.pass?"PASS":"FAIL"}</span><span>{check.detail}</span><span>{check.pass?"software contract satisfied":"investigate"}</span>
        </div>)}
      </div>

      <h2 style={{marginTop:38}}>Provider readiness</h2>
      <div className="table">
        {status.infrastructure.providers.map(p=><div className="tr" key={p.provider}>
          <b>{p.provider}</b><span className={p.commercialReady?"green":"amber"}>{p.grade}</span><span>{p.environment}</span><span>{p.commercialReady?"commercial fulfillment ready":p.blockers.join(" · ")||"credentials not configured"}</span>
        </div>)}
      </div>

      <p style={{marginTop:30,color:"#91a0b8"}}>Generated {status.generatedAt}. Commit {status.infrastructure.deploymentCommitSha||"not observed"}. No secret values are exposed.</p>
    </div>
  </main>;
}
