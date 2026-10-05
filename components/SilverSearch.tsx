"use client";
import type { Party } from "@/src/core/planner";
import type { SearchRegion,StayDuration } from "@/src/core/search";
import { growthEvent } from "@/src/growth/client";

export default function SilverSearch(props:{
  query:string;setQuery:(v:string)=>void;
  region:SearchRegion;setRegion:(v:SearchRegion)=>void;
  checkIn:string;setCheckIn:(v:string)=>void;
  flexibleDays:0|7|30;setFlexibleDays:(v:0|7|30)=>void;
  duration:StayDuration;setDuration:(v:StayDuration)=>void;
  party:Party;setParty:(v:Party)=>void;
  budget:number;setBudget:(v:number)=>void;count:number;onSearch:()=>void;
}){
  return <div className="consumerSearch">
    <div className="consumerSearchPrimary">
      <label><span>Where do you want to live?</span><input value={props.query} onChange={e=>props.setQuery(e.target.value)} placeholder="Madrid, Tenerife, Thailand…"/></label>
      <label><span>When?</span><input type="date" value={props.checkIn} onChange={e=>{props.setCheckIn(e.target.value);growthEvent("filter_change",{filter:"check_in",value:e.target.value})}}/></label>
      <label><span>For how long?</span><select aria-label="Stay duration" value={props.duration} onChange={e=>{const v=Number(e.target.value) as StayDuration;props.setDuration(v);growthEvent("filter_change",{filter:"duration",value:v})}}>{[30,60,90,120,180,365].map(d=><option key={d} value={d}>{d} days</option>)}</select></label>
      <button className="searchCta" onClick={props.onSearch}>Search stays →</button>
    </div>
    <details className="searchMore">
      <summary>More options <span>budget · guests · flexibility · region</span></summary>
      <div className="searchMoreGrid">
        <label><span>Date flexibility</span><select value={props.flexibleDays} onChange={e=>{const v=Number(e.target.value) as 0|7|30;props.setFlexibleDays(v);growthEvent("filter_change",{filter:"flexible_days",value:v})}}><option value={0}>Exact dates</option><option value={7}>± 7 days</option><option value={30}>± 30 days</option></select></label>
        <label><span>Guests</span><select aria-label="Travelling party" value={props.party} onChange={e=>{const v=e.target.value as Party;props.setParty(v);growthEvent("filter_change",{filter:"party",value:v})}}><option value="solo">1 guest</option><option value="couple">2 guests</option></select></label>
        <label><span>Region</span><select aria-label="Region" value={props.region} onChange={e=>{const v=e.target.value as SearchRegion;props.setRegion(v);growthEvent("filter_change",{filter:"region",value:v})}}><option>All</option><option>Europe</option><option>Asia</option><option>Africa</option><option>Americas</option></select></label>
        <label className="searchBudget"><span>Max / month</span><input aria-label="Maximum monthly hotel budget" inputMode="numeric" value={Math.round(props.budget)} onChange={e=>props.setBudget(Math.max(1,Number(e.target.value.replace(/[^0-9]/g,""))||1))}/></label>
      </div>
    </details>
    <small className="searchInventoryHint">{props.count>0?props.count.toLocaleString("en-US")+" real hotels Atlas can source. Live prices only appear when verified.":"Live prices only appear when verified."}</small>
  </div>;
}
