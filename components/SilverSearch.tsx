"use client";
import type { Party } from "@/src/core/planner";
import type { SearchRegion,StayDuration } from "@/src/core/search";

export default function SilverSearch(props:{
  query:string;setQuery:(v:string)=>void;
  region:SearchRegion;setRegion:(v:SearchRegion)=>void;
  checkIn:string;setCheckIn:(v:string)=>void;
  flexibleDays:0|7|30;setFlexibleDays:(v:0|7|30)=>void;
  duration:StayDuration;setDuration:(v:StayDuration)=>void;
  party:Party;setParty:(v:Party)=>void;
  budget:number;setBudget:(v:number)=>void;count:number;onSearch:()=>void;
}){
  return <div className="silverSearch">
    <label><span>Where?</span><input value={props.query} onChange={e=>props.setQuery(e.target.value)} placeholder="Tenerife, sea, Thailand…"/></label>
    <label><span>Start</span><input type="date" value={props.checkIn} onChange={e=>props.setCheckIn(e.target.value)}/></label>
    <label><span>Flexible</span><select value={props.flexibleDays} onChange={e=>props.setFlexibleDays(Number(e.target.value) as 0|7|30)}><option value={0}>Exact dates</option><option value={7}>± 7 days</option><option value={30}>± 30 days</option></select></label>
    <label><span>Stay</span><select value={props.duration} onChange={e=>props.setDuration(Number(e.target.value) as StayDuration)}>{[30,60,90,120,180,365].map(d=><option key={d} value={d}>{d} days</option>)}</select></label>
    <label><span>Travelling</span><select value={props.party} onChange={e=>props.setParty(e.target.value as Party)}><option value="solo">Solo</option><option value="couple">Couple</option></select></label>
    <label><span>Region</span><select value={props.region} onChange={e=>props.setRegion(e.target.value as SearchRegion)}><option>All</option><option>Europe</option><option>Asia</option><option>Africa</option><option>Americas</option></select></label>
    <label className="searchBudget"><span>MAX / MONTH</span><input aria-label="Maximum monthly hotel budget" inputMode="numeric" value={Math.round(props.budget)} onChange={e=>props.setBudget(Math.max(1,Number(e.target.value.replace(/[^0-9]/g,""))||1))}/></label>
    <button className="searchCta" onClick={props.onSearch}>Browse {props.count} real hotels</button>
  </div>;
}
