import { cookies } from "next/headers";
import { notFound } from "next/navigation";
import { OPS_COOKIE,verifyOpsSession } from "@/src/security/ops-session";
import { listHotelDesk } from "@/src/db/direct-supply";
import { listSourcingRequests } from "@/src/db/sourcing";
import { providerReadinessReport } from "@/src/providers/live/conformance";

export const metadata={title:"Hotel Desk",robots:{index:false,follow:false}};

export default async function HotelDesk(){
  const jar=await cookies();
  if(!verifyOpsSession(jar.get(OPS_COOKIE)?.value)) notFound();
  const [desk,sourcing]=await Promise.all([listHotelDesk(),listSourcingRequests(100)]);
  const providers=providerReadinessReport();

  return <main className="controlPage"><div className="shell">
    <a className="eyebrow" style={{color:"#0a1630"}} href="/control">← Control Tower</a>
    <h1>HOTEL DESK</h1>
    <p style={{color:"#91a0b8",maxWidth:820}}>Direct long-stay contracting. Discovery is not publication: rates remain DRAFT until contract evidence and a booking path exist.</p>

    <div className="metrics">
      <div className="metricDark"><b>{sourcing.filter(r=>r.status==="OPEN"||r.status==="SOURCING").length}</b><span>customer sourcing queue</span></div>
      <div className="metricDark"><b>{desk.leads.length}</b><span>hotel leads</span></div>
      <div className="metricDark"><b>{desk.rates.length}</b><span>direct rate records</span></div>
      <div className="metricDark"><b>{desk.rates.filter((r:any)=>r.contract_verified).length}</b><span>contract verified</span></div>
      <div className="metricDark"><b>{desk.rates.filter((r:any)=>r.publication_state==="READY_FOR_REVIEW").length}</b><span>ready for truth review</span></div>
    </div>

    <h2 style={{marginTop:36}}>Commercial supply activation</h2>
    <div className="table">
      <div className="tr"><b>Provider</b><b>Grade</b><b>Environment</b><b>Blockers</b></div>
      {providers.map(p=><div className="tr" key={p.provider}><b>{p.provider}</b><span className={p.commercialReady?"green":"amber"}>{p.grade}</span><span>{p.environment}</span><span>{p.commercialReady?"Customer-targeted probes armed":p.blockers.join(" · ")||"credentials missing"}</span></div>)}
      <div className="tr"><b>Direct Hotel OS</b><span className="green">ARMED</span><span>contract evidence</span><span>30–365d · customer sourcing always routes here as fallback</span></div>
    </div>

    <h2 style={{marginTop:36}}>Customer sourcing queue</h2>
    <div className="table">
      {sourcing.length?sourcing.map(r=><div className="tr" key={r.id}>
        <b>{r.hotel_name}</b>
        <span>{r.city}, {r.country}</span>
        <span>{r.nights}d · {r.occupancy} guest{r.occupancy===1?"":"s"} · {r.check_in}</span>
        <span className={r.status==="MATCHED"?"green":"amber"}>{r.status}{r.target_monthly_eur?" · €"+Math.round(r.target_monthly_eur)+"/mo target":""}</span>
      </div>):<div className="tr"><b>No customer sourcing requests yet</b><span>Rate-pending hotel pages can create them</span><span>30–365d</span><span className="amber">WAITING</span></div>}
    </div>

    <h2 style={{marginTop:36}}>Leads</h2>
    <div className="table">
      {desk.leads.length?desk.leads.map((l:any)=><div className="tr" key={l.id}><b>{l.hotel_name}</b><span>{l.city}, {l.country}</span><span>{l.contact_role||"—"}</span><span>{l.status}</span></div>):<div className="tr"><b>No leads yet</b><span>Use /api/hotel-desk/leads</span><span>—</span><span className="amber">WAITING</span></div>}
    </div>

    <h2 style={{marginTop:36}}>LONG rates</h2>
    <div className="table">
      {desk.rates.length?desk.rates.map((r:any)=><div className="tr" key={r.id}><b>{r.hotel_name} · {r.rate_code}</b><span>{r.min_nights}–{r.max_nights||"∞"} nights</span><span>{r.currency} {Math.round(r.monthly_price)}/mo</span><span className={r.publication_state==="READY_FOR_REVIEW"?"green":"amber"}>{r.publication_state}</span></div>):<div className="tr"><b>No direct rates yet</b><span>LONG30/60/90/180</span><span>—</span><span className="amber">DRAFT</span></div>}
    </div>
  </div></main>;
}
