"use client";
import { useState } from "react";
import type { StayDuration } from "@/src/core/search";

export default function SourceStayForm({hotelId,defaultCheckIn,defaultDuration}:{hotelId:string;defaultCheckIn:string;defaultDuration:StayDuration}){
  const[checkIn,setCheckIn]=useState(defaultCheckIn);
  const[nights,setNights]=useState<StayDuration>(defaultDuration);
  const[occupancy,setOccupancy]=useState<1|2>(1);
  const[budget,setBudget]=useState("");
  const[state,setState]=useState<"idle"|"sending"|"done"|"error">("idle");
  async function submit(){
    setState("sending");
    const res=await fetch("/api/sourcing",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({
      hotelId,checkIn,nights,occupancy,
      targetMonthlyEur:budget?Number(budget):undefined,
      sourcePath:location.pathname+location.search,
    })}).catch(()=>null);
    setState(res?.ok?"done":"error");
  }
  return <div className="sourceStay">
    <div className="eyebrow">ASK ATLAS SUPPLY</div>
    <h3>Source a real long-stay rate for this hotel.</h3>
    <p>No name, email or phone is required. This creates an anonymous demand signal in Atlas Supply.</p>
    <div className="sourceStayGrid">
      <label><span>Check-in</span><input type="date" value={checkIn} onChange={e=>setCheckIn(e.target.value)}/></label>
      <label><span>Stay</span><select value={nights} onChange={e=>setNights(Number(e.target.value) as StayDuration)}>{[30,60,90,120,180,365].map(v=><option value={v} key={v}>{v} days</option>)}</select></label>
      <label><span>Guests</span><select value={occupancy} onChange={e=>setOccupancy(Number(e.target.value) as 1|2)}><option value={1}>1</option><option value={2}>2</option></select></label>
      <label><span>Target €/month</span><input inputMode="numeric" value={budget} onChange={e=>setBudget(e.target.value.replace(/[^0-9.]/g,""))} placeholder="optional"/></label>
    </div>
    <button className="btn lime" disabled={state==="sending"||state==="done"} onClick={submit}>{state==="sending"?"Creating request…":state==="done"?"Request in Atlas Supply ✓":"Source this stay →"}</button>
    {state==="error"&&<p className="sourceError">Could not create the sourcing request. Try again.</p>}
  </div>;
}
