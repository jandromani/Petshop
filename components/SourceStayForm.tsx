"use client";
import { useState } from "react";
import type { StayDuration } from "@/src/core/search";
import { growthEvent } from "@/src/growth/client";

export default function SourceStayForm({hotelId,defaultCheckIn,defaultDuration}:{hotelId:string;defaultCheckIn:string;defaultDuration:StayDuration}){
  const[checkIn,setCheckIn]=useState(defaultCheckIn);const[nights,setNights]=useState<StayDuration>(defaultDuration);const[occupancy,setOccupancy]=useState<1|2>(1);const[budget,setBudget]=useState("");const[state,setState]=useState<"idle"|"sending"|"done"|"error">("idle");
  async function submit(){
    setState("sending");growthEvent("source_rate_start",{hotel_id:hotelId,nights,occupancy,target_monthly:budget?Number(budget):0});
    const res=await fetch("/api/sourcing",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({hotelId,checkIn,nights,occupancy,targetMonthlyEur:budget?Number(budget):undefined,sourcePath:location.pathname+location.search})}).catch(()=>null);
    const ok=Boolean(res?.ok);setState(ok?"done":"error");growthEvent(ok?"source_rate_success":"source_rate_error",{hotel_id:hotelId,nights,occupancy});
  }
  return <div className="sourceStay">
    <div className="eyebrow">REQUEST A RATE</div><h3>Request a long-stay price for these dates.</h3>
    <p>Atlas will record your request and check verified sources. This does not promise availability or an email notification.</p>
    <div className="sourceStayGrid">
      <label><span>Check-in</span><input type="date" value={checkIn} onChange={e=>setCheckIn(e.target.value)}/></label>
      <label><span>Stay</span><select value={nights} onChange={e=>setNights(Number(e.target.value) as StayDuration)}>{[30,60,90,120,180,365].map(v=><option value={v} key={v}>{v} days</option>)}</select></label>
      <label><span>Guests</span><select value={occupancy} onChange={e=>setOccupancy(Number(e.target.value) as 1|2)}><option value={1}>1</option><option value={2}>2</option></select></label>
      <label><span>Target €/month</span><input inputMode="numeric" value={budget} onChange={e=>setBudget(e.target.value.replace(/[^0-9.]/g,""))} placeholder="optional"/></label>
    </div>
    <button className="btn lime" disabled={state==="sending"||state==="done"} onClick={submit}>{state==="sending"?"Saving request…":state==="done"?"Request saved ✓":"Request this rate →"}</button>
    {state==="done"&&<p className="sourceSuccess">Request saved. Reopen this hotel or your Saved page to check for a verified rate.</p>}
    {state==="error"&&<p className="sourceError">Could not save the request. Try again.</p>}
  </div>;
}
