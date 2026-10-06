"use client";
import { useCopy } from "@/components/useCopy";
import { useState } from "react";
import type { StayDuration } from "@/src/core/search";
import { growthEvent } from "@/src/growth/client";

export default function RateAlertForm({hotel,defaultCheckIn,defaultDuration,defaultOccupancy=1,defaultBudget}:{hotel:{id:string;name:string;city:string;country:string};defaultCheckIn:string;defaultDuration:StayDuration;defaultOccupancy?:1|2;defaultBudget?:number}){
  const {t,local,language}=useCopy();
  const initial=defaultDuration===30||defaultDuration===60?defaultDuration:90;
  const[checkIn,setCheckIn]=useState(defaultCheckIn);const[nights,setNights]=useState<StayDuration>(initial);const[occupancy,setOccupancy]=useState<1|2>(defaultOccupancy);const[target,setTarget]=useState(defaultBudget?String(defaultBudget):"");const[state,setState]=useState<"idle"|"saving"|"done"|"error">("idle");
  async function save(){
    setState("saving");const res=await fetch("/api/alerts/rates",{method:"PUT",headers:{"content-type":"application/json"},body:JSON.stringify({hotelId:hotel.id,hotelName:hotel.name,city:hotel.city,country:hotel.country,checkIn,nights,occupancy,targetMonthly:target?Number(target):null})}).catch(()=>null);
    const ok=Boolean(res?.ok);setState(ok?"done":"error");growthEvent(ok?"rate_alert_created":"rate_alert_error",{hotel_id:hotel.id,nights,occupancy,target_monthly:target?Number(target):0});
  }
  return <div className="rateAlertForm"><div className="eyebrow">{t("DEVICE RATE WATCH")}</div><h3>{t("Keep this exact stay on your shortlist.")}</h3><p>{t("This browser can remember the watch. For active sourcing and a return path by email, use the private-rate request above.")}</p><div className="sourceStayGrid">
    <label><span>{t("Check-in")}</span><input type="date" value={checkIn} onChange={e=>setCheckIn(e.target.value)}/></label>
    <label><span>{t("Stay")}</span><select value={nights} onChange={e=>setNights(Number(e.target.value) as StayDuration)}>{[30,60,90].map(v=><option value={v} key={v}>{v} {t("days")}</option>)}</select></label>
    <label><span>{t("Guests")}</span><select value={occupancy} onChange={e=>setOccupancy(Number(e.target.value) as 1|2)}><option value={1}>1</option><option value={2}>2</option></select></label>
    <label><span>{t("Target €/month")}</span><input inputMode="numeric" value={target} onChange={e=>setTarget(e.target.value.replace(/[^0-9.]/g,""))} placeholder={t("any verified rate")}/></label>
  </div><button className="btn ghost" disabled={state==="saving"||state==="done"} onClick={save}>{state==="saving"?t("Saving…"):state==="done"?t("Watching on this device ✓"):t("Watch on this device")}</button>{state==="error"&&<p className="sourceError">{t("Could not save this rate watch. Try again.")}</p>}</div>;
}
