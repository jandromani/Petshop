import { cookies } from "next/headers";
import { notFound } from "next/navigation";
import { hotels } from "@/src/data/hotels";
import { evaluateSellability } from "@/src/core/truth";
import { AGENTS } from "@/src/agents/registry";

export const metadata = { title: "Control Tower", robots: { index: false, follow: false } };

export default async function ControlTower() {
  const jar = await cookies();
  const configured = process.env.OPS_ACCESS_KEY;
  if (!configured || jar.get("atlas_ops")?.value !== configured) notFound();

  const truth = hotels.map(evaluateSellability);
  const sellable = truth.filter(x=>x.state==="SELLABLE").length;
  const avgConfidence = truth.reduce((s,x)=>s+x.confidence,0)/truth.length;
  const providers = ["booking","ratehawk","hbx"].map(p=>({
    name:p,
    count:hotels.filter(h=>h.provider===p).length,
    freshness:Math.round(hotels.filter(h=>h.provider===p).reduce((s,h)=>s+h.verifiedHoursAgo,0)/Math.max(1,hotels.filter(h=>h.provider===p).length))
  }));

  return <main className="controlPage">
    <div className="shell">
      <a href="/" className="eyebrow" style={{color:"#0a1630"}}>← consumer experience</a>
      <h1>CONTROL TOWER</h1>
      <p style={{color:"#91a0b8",maxWidth:760}}>Private operating plane: supply truth, referrals, agents, judges and human-attention budget.</p>
      <div className="metrics">
        <div className="metricDark"><b>{hotels.length}</b><span>canonical seed hotels</span></div>
        <div className="metricDark"><b className="green">{sellable}</b><span>sellable seed records</span></div>
        <div className="metricDark"><b>{(avgConfidence*100).toFixed(1)}%</b><span>truth confidence</span></div>
        <div className="metricDark"><b>3</b><span>provider surfaces</span></div>
        <div className="metricDark"><b>{Object.keys(AGENTS).length}</b><span>bounded agent roles</span></div>
      </div>

      <h2 style={{marginTop:36}}>Provider health</h2>
      <div className="table">
        <div className="tr"><b>Provider</b><b>Records</b><b>Avg freshness</b><b>Status</b></div>
        {providers.map(p=><div className="tr" key={p.name}><span>{p.name}</span><span>{p.count}</span><span>{p.freshness}h</span><span className="green">HEALTHY · seed</span></div>)}
      </div>

      <h2 style={{marginTop:36}}>Autonomous workforce</h2>
      <div className="table">
        {Object.values(AGENTS).map(a=><div className="tr" key={a.key}>
          <b>{a.key}</b>
          <span>{a.reduces}</span>
          <span>{a.requiredJudges.join(", ")}</span>
          <span className="amber">€{a.maxExternalSpendEur}/run authority</span>
        </div>)}
      </div>

      <h2 style={{marginTop:36}}>Human attention budget</h2>
      <div className="metrics">
        <div className="metricDark"><b>&lt; 60m</b><span>daily human governance target</span></div>
        <div className="metricDark"><b>0</b><span>agents allowed to publish prices</span></div>
        <div className="metricDark"><b>0</b><span>agents allowed to sign contracts</span></div>
        <div className="metricDark"><b>6</b><span>planned external judge classes</span></div>
        <div className="metricDark"><b>1</b><span>company constitution</span></div>
      </div>
    </div>
  </main>
}
