import HotelAccessControl,{RevokeHotelAccess} from "@/components/HotelAccessControl";
import LiteApiProbeForm from "@/components/LiteApiProbeForm";
import { listHotelAccess } from "@/src/db/hotel-portal";
import { LiteApiClient } from "@/src/providers/live/liteapi";
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
  const [desk,sourcing,accesses]=await Promise.all([listHotelDesk(),listSourcingRequests(100),listHotelAccess()]);
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
      <div className="metricDark"><b>{desk.rates.filter((r:any)=>r.merchant_enabled&&r.merchant_terms_verified).length}</b><span>merchant-configured rates</span></div>
      <div className="metricDark"><b>{desk.rates.reduce((s:number,r:any)=>s+Math.max(0,Number(r.inventory_units||0)-Number(r.reserved_units||0)-Number(r.sold_units||0)),0)}</b><span>available allocated units</span></div>
    </div>

    <h2 style={{marginTop:36}}>Commercial supply activation</h2>
    <div className="table">
      <div className="tr"><b>Provider</b><b>Grade</b><b>Environment</b><b>Blockers</b></div>
      {providers.map(p=><div className="tr" key={p.provider}><b>{p.provider}</b><span className={p.commercialReady?"green":"amber"}>{p.grade}</span><span>{p.environment}</span><span>{p.commercialReady?"Customer-targeted probes armed":p.blockers.join(" · ")||"credentials missing"}</span></div>)}
      <div className="tr"><b>Direct Hotel OS</b><span className="green">ARMED</span><span>contract evidence</span><span>30–90d · customer sourcing always routes here as fallback</span></div>
    </div>

    <LiteApiProbeForm configured={new LiteApiClient().status().configured}/>
    <h2 style={{marginTop:36}}>Customer sourcing queue</h2>
    <div className="table">
      {sourcing.length?sourcing.map(r=><div className="tr" key={r.id}>
        <b>{r.hotel_name}</b>
        <span>{r.city}, {r.country}</span>
        <span>{r.nights}d · {r.occupancy} guest{r.occupancy===1?"":"s"} · {r.check_in}</span>
        <span className={r.status==="MATCHED"?"green":"amber"}>{r.status}{r.target_monthly_eur?" · €"+Math.round(r.target_monthly_eur)+"/mo target":""}</span>
      </div>):<div className="tr"><b>No customer sourcing requests yet</b><span>Rate-pending hotel pages can create them</span><span>30–90d</span><span className="amber">WAITING</span></div>}
    </div>

    <h2 style={{marginTop:36}}>Leads</h2>
    <div className="table">
      {desk.leads.length?desk.leads.map((l:any)=><div className="tr" key={l.id}><b>{l.hotel_name}</b><span>{l.city}, {l.country}</span><span>{l.contact_role||"—"}</span><span>{l.status}</span></div>):<div className="tr"><b>No leads yet</b><span>Use /api/hotel-desk/leads</span><span>—</span><span className="amber">WAITING</span></div>}
    </div>

    <h2 style={{marginTop:36}}>Partner access</h2>
    <p>Verify the official contact before issuing a code. Codes grant hotel-specific proposal access for 7 days; they never grant Atlas operations access.</p>
    <div className="partnerProposals">{desk.leads.map((l:any)=><article key={l.id} className="partnerOpsCard"><h3>{l.hotel_name}</h3><p>{l.city}, {l.country} · {l.contact_email||"Contact email missing"}</p><HotelAccessControl leadId={l.id}/></article>)}</div>
    <h3>Active access codes</h3><div className="table">{accesses.map(a=><div className="tr" key={String(a.id)}><b>{a.hotel_name}</b><span>Expires {a.expires_at}</span><RevokeHotelAccess id={String(a.id)}/></div>)}</div>

    <h2 style={{marginTop:36}}>LONG rates</h2>
    <div className="table">
      {desk.rates.length?desk.rates.map((r:any)=><div className="tr" key={r.id}><b>{r.hotel_name} · {r.rate_code}</b><span>{r.min_nights}–{r.max_nights||"∞"} nights</span><span>{r.currency} {Math.round(r.monthly_price)}/mo · {r.channel_model||"REFERRAL"}</span><span className={r.publication_state==="LIVE"?"green":"amber"}>{r.publication_state}{r.merchant_enabled?" · "+Math.max(0,Number(r.inventory_units||0)-Number(r.reserved_units||0)-Number(r.sold_units||0))+" units":""}</span></div>):<div className="tr"><b>No direct rates yet</b><span>LONG30/60/90</span><span>—</span><span className="amber">DRAFT</span></div>}
    </div>
  </div></main>;
}
