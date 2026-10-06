"use client";
import { useCopy } from "@/components/useCopy";
import { useState } from "react";
import { growthEvent } from "@/src/growth/client";
import type { SearchRegion,StayDuration } from "@/src/core/search";

export type AiSearchIntent={query:string;region:SearchRegion;duration:StayDuration;occupancy:1|2;maxMonthly:number|null;flexibleDays:0|7|30;amenities:string[];unsupportedPreferences?:string[];evidenceMode?:"supported"|"partial";summary:string};

export default function AiHotelSearch({current,onApply}:{current:{region:SearchRegion;duration:StayDuration;occupancy:1|2;maxMonthly:number};onApply:(intent:AiSearchIntent)=>void}){
  const {t,local,language}=useCopy();
  const[prompt,setPrompt]=useState("");const[loading,setLoading]=useState(false);const[intent,setIntent]=useState<AiSearchIntent|null>(null);const[error,setError]=useState(false);const[open,setOpen]=useState(false);
  async function run(){const value=prompt.trim();if(!value||loading)return;setLoading(true);setError(false);growthEvent("ai_search_submit",{characters:value.length});try{
    const res=await fetch("/api/search/intent",{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({prompt:value,current,language})});const data=await res.json();if(!res.ok||!data?.intent)throw new Error("intent");
    setIntent(data.intent);onApply(data.intent);growthEvent("ai_filters_applied",{query:data.intent.query||"all",region:data.intent.region,duration:data.intent.duration,occupancy:data.intent.occupancy,amenities:data.intent.amenities.length,unsupported_preferences:data.intent.unsupportedPreferences?.length||0});
  }catch{setError(true)}finally{setLoading(false)}}
  if(!open)return <button className="aiSearchAlternative" onClick={()=>setOpen(true)}>{t("✨ Describe your ideal stay instead")}</button>;
  return <div className="aiSearchBox consumerAiSearch">
    <div className="aiSearchLabel"><b>{t("ASK ATLAS ✦")}</b><span>{t("Describe the life you want. Atlas will turn it into search filters.")}</span></div>
    <div className="aiSearchRow"><input autoFocus aria-label={t("Describe your ideal long stay")} value={prompt} onChange={e=>setPrompt(e.target.value)} onKeyDown={e=>e.key==="Enter"&&run()} placeholder={t("Warm sea, good healthcare, gym, under €1,800/month…")}/><button className="btn lime" onClick={run} disabled={loading}>{loading?t("Searching…"):t("Search with Atlas →")}</button></div>
    {intent&&<div className="intentChips"><span>{intent.duration} {t("days")}</span><span>{intent.occupancy===2?t("2 guests"):t("1 guest")}</span>{intent.region!=="All"&&<span>{t(intent.region)}</span>}{intent.query&&<span>{intent.query}</span>}{intent.maxMonthly&&<span>≤ €{Math.round(intent.maxMonthly).toLocaleString("en-US")}{t("/mo")}</span>}{intent.amenities.map(a=><span key={a}>{t(a)}</span>)}</div>}
    {intent&&<small className="aiSearchSummary">{intent.summary}</small>}
    {error&&<small className="sourceError">{t("Atlas could not interpret that request. Use the standard search above.")}</small>}
    <button className="aiSearchClose" onClick={()=>setOpen(false)}>{t("Use standard search")}</button>
  </div>;
}
