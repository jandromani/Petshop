"use client";
import { useState } from "react";
import type { StayDuration } from "@/src/core/search";
import { growthEvent } from "@/src/growth/client";

type Result={notification?:"automatic"|"ops-queue";status?:string;id?:string};

export default function SourceStayForm({hotelId,defaultCheckIn,defaultDuration}:{hotelId:string;defaultCheckIn:string;defaultDuration:StayDuration}){
  const initial=defaultDuration===30||defaultDuration===60?defaultDuration:90;
  const[checkIn,setCheckIn]=useState(defaultCheckIn);const[nights,setNights]=useState<StayDuration>(initial);const[occupancy,setOccupancy]=useState<1|2>(1);
  const[budget,setBudget]=useState("");const[email,setEmail]=useState("");const[consent,setConsent]=useState(false);
  const[state,setState]=useState<"idle"|"sending"|"done"|"error">("idle");const[result,setResult]=useState<Result|null>(null);

  async function submit(){
    if(!email||!consent)return;
    setState("sending");growthEvent("source_rate_start",{hotel_id:hotelId,nights,occupancy,target_monthly:budget?Number(budget):0});
    const res=await fetch("/api/sourcing",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({hotelId,checkIn,nights,occupancy,targetMonthlyEur:budget?Number(budget):undefined,requesterEmail:email,contactConsent:consent,sourcePath:location.pathname+location.search})}).catch(()=>null);
    const data=await res?.json().catch(()=>null);
    const ok=Boolean(res?.ok);setResult(data||null);setState(ok?"done":"error");growthEvent(ok?"source_rate_success":"source_rate_error",{hotel_id:hotelId,nights,occupancy,notification:data?.notification||"unknown"});
  }

  return <div className="sourceStay">
    <div className="eyebrow">PRIVATE LONG-STAY RATE</div><h3>Ask Atlas to source this stay.</h3>
    <p>This creates a real sourcing case. Atlas checks commercially connected sources first and keeps a Direct Hotel OS fallback instead of fabricating a price.</p>
    <div className="sourceStayGrid">
      <label><span>Check-in</span><input type="date" value={checkIn} onChange={e=>setCheckIn(e.target.value)}/></label>
      <label><span>Stay</span><select value={nights} onChange={e=>setNights(Number(e.target.value) as StayDuration)}>{[30,60,90].map(v=><option value={v} key={v}>{v} days</option>)}</select></label>
      <label><span>Guests</span><select value={occupancy} onChange={e=>setOccupancy(Number(e.target.value) as 1|2)}><option value={1}>1</option><option value={2}>2</option></select></label>
      <label><span>Target €/month</span><input inputMode="numeric" value={budget} onChange={e=>setBudget(e.target.value.replace(/[^0-9.]/g,""))} placeholder="optional"/></label>
      <label className="sourceEmail"><span>Email for the quote</span><input type="email" autoComplete="email" value={email} onChange={e=>setEmail(e.target.value)} placeholder="you@example.com"/></label>
    </div>
    <label className="sourceConsent"><input type="checkbox" checked={consent} onChange={e=>setConsent(e.target.checked)}/><span>Use this email only to operate this sourcing request and return a verified quote or status update.</span></label>
    <button className="btn lime" disabled={state==="sending"||state==="done"||!email||!consent} onClick={submit}>{state==="sending"?"Creating sourcing case…":state==="done"?"Sourcing case active ✓":"Source this stay →"}</button>
    {state==="done"&&<div className="sourceSuccess"><b>Request accepted.</b><p>{result?.notification==="automatic"?"Automatic email delivery is active for this environment.":"Your email is attached to the sourcing case so Atlas operations can return a verified quote. Automated email delivery is not configured in this environment."}</p><small>Case {result?.id?.slice(0,8)||"created"} · status {result?.status||"SOURCING"}</small></div>}
    {state==="error"&&<p className="sourceError">Could not create the sourcing case. Check the email and try again.</p>}
  </div>;
}
