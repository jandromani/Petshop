"use client";
import { useMemo,useState } from "react";
import { addDays,defaultCheckIn } from "@/src/core/search";
import { assessSchengen90In180,parsePresenceRanges,type PresenceRange } from "@/src/compliance/schengen";
import { assessTaxDayScreen } from "@/src/compliance/tax-day-risk";

export default function SchengenCalculator(){
  const[history,setHistory]=useState("");const[checkIn,setCheckIn]=useState(()=>defaultCheckIn());const[nights,setNights]=useState<30|60|90>(60);
  const result=useMemo(()=>{try{const previous=parsePresenceRanges(history);const schengen=assessSchengen90In180(previous,checkIn,nights);const proposed:PresenceRange={entry:checkIn,exit:addDays(checkIn,nights)};const tax=assessTaxDayScreen([...previous,proposed],Number(checkIn.slice(0,4)));return{schengen,tax,error:null}}catch(e){return{schengen:null,tax:null,error:String(e instanceof Error?e.message:e)}}},[history,checkIn,nights]);
  return <div className="complianceCalculator card">
    <div className="eyebrow">DETERMINISTIC 90/180 ENGINE</div><h2>Test the travel days, not just the hotel nights.</h2>
    <div className="complianceInputs"><label><span>Previous Schengen stays</span><textarea value={history} onChange={e=>setHistory(e.target.value)} placeholder={"2026-06-01..2026-06-15\n2026-08-10..2026-08-20"}/><small>One range per line. Entry and exit both count.</small></label><label><span>Proposed check-in</span><input type="date" value={checkIn} onChange={e=>setCheckIn(e.target.value)}/></label><label><span>Hotel nights</span><select value={nights} onChange={e=>setNights(Number(e.target.value) as 30|60|90)}><option value={30}>30 nights</option><option value={60}>60 nights</option><option value={90}>90 nights</option></select></label></div>
    {result.error?<p className="sourceError">{result.error}</p>:result.schengen&&result.tax?<div className="complianceResults"><div className={result.schengen.eligible?"green":"amber"}><span>SCHENGEN 90/180 SCREEN</span><b>{result.schengen.eligible?"PASS ON ENTERED HISTORY":"BREACH DETECTED"}</b><p>{result.schengen.hotelNights} hotel nights = <strong>{result.schengen.presenceDays} presence days</strong>. Prior days in the rolling window at entry: {result.schengen.priorDaysAtEntry}.{result.schengen.firstBreachDate?" First breach: "+result.schengen.firstBreachDate+".":""}</p></div><div className={result.tax.level==="HIGH_DAY_COUNT"?"amber":""}><span>GENERIC TAX DAY SCREEN · {result.tax.year}</span><b>{result.tax.days} presence days entered</b><p>{result.tax.level==="HIGH_DAY_COUNT"?"The entered stays cross the common 183-day screening threshold. This is not a tax-residence conclusion.":"Below the common 183-day screening threshold on the entered dates. Other residence tests can still apply."}</p></div></div>:null}
    <p className="readinessNote">This is a planning screen only. Long-stay visas, residence permits, bilateral rules and country-specific tax tests can override simple day counts.</p>
  </div>;
}
