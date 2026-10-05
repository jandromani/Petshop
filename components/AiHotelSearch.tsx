"use client";
import { useState } from "react";
import { growthEvent } from "@/src/growth/client";
import type { SearchRegion,StayDuration } from "@/src/core/search";

export type AiSearchIntent={query:string;region:SearchRegion;duration:StayDuration;occupancy:1|2;maxMonthly:number|null;flexibleDays:0|7|30;amenities:string[];unsupportedPreferences?:string[];evidenceMode?:"supported"|"partial";summary:string};

export default function AiHotelSearch({current,onApply}:{current:{region:SearchRegion;duration:StayDuration;occupancy:1|2;maxMonthly:number};onApply:(intent:AiSearchIntent)=>void}){
  const[prompt,setPrompt]=useState("");const[loading,setLoading]=useState(false);const[intent,setIntent]=useState<AiSearchIntent|null>(null);const[error,setError]=useState(false);const[open,setOpen]=useState(false);
  async function run(){const value=prompt.trim();if(!value||loading)return;setLoading(true);setError(false);growthEvent("ai_search_submit",{characters:value.length});try{
    const res=await fetch("/api/search/intent",{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({prompt:value,current})});const data=await res.json();if(!res.ok||!data?.intent)throw new Error("intent");
    setIntent(data.intent);onApply(data.intent);growthEvent("ai_filters_applied",{query:data.intent.query||"all",region:data.intent.region,duration:data.intent.duration,occupancy:data.intent.occupancy,amenities:data.intent.amenities.length,unsupported_preferences:data.intent.unsupportedPreferences?.length||0});
  }catch{setError(true)}finally{setLoading(false)}}
  if(!open)return <button className="aiSearchAlternative" onClick={()=>setOpen(true)}>✨ Describe your ideal stay instead</button>;
  return <div className="aiSearchBox consumerAiSearch">
    <div className="aiSearchLabel"><b>ASK ATLAS ✦</b><span>Describe the life you want. Atlas will turn it into search filters.</span></div>
    <div className="aiSearchRow"><input autoFocus aria-label="Describe your ideal long stay" value={prompt} onChange={e=>setPrompt(e.target.value)} onKeyDown={e=>e.key==="Enter"&&run()} placeholder="Warm sea, good healthcare, gym, under €1,800/month…"/><button className="btn lime" onClick={run} disabled={loading}>{loading?"Searching…":"Search with Atlas →"}</button></div>
    {intent&&<div className="intentChips"><span>{intent.duration} days</span><span>{intent.occupancy===2?"2 guests":"1 guest"}</span>{intent.region!=="All"&&<span>{intent.region}</span>}{intent.query&&<span>{intent.query}</span>}{intent.maxMonthly&&<span>≤ €{Math.round(intent.maxMonthly).toLocaleString("en-US")}/mo</span>}{intent.amenities.map(a=><span key={a}>{a}</span>)}</div>}
    {intent&&<small className="aiSearchSummary">{intent.summary}</small>}
    {error&&<small className="sourceError">Atlas could not interpret that request. Use the standard search above.</small>}
    <button className="aiSearchClose" onClick={()=>setOpen(false)}>Use standard search</button>
  </div>;
}
