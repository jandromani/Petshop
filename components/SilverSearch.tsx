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
  budget:number;count:number;onSearch:()=>void;
}){
  return <div className="silverSearch">
    <label><span>Where?</span><input value={props.query} onChange={e=>props.setQuery(e.target.value)} placeholder="Tenerife, sea, Thailand…"/></label>
    <label><span>Start</span><input type="date" value={props.checkIn} onChange={e=>props.setCheckIn(e.target.value)}/></label>
    <label><span>Flexible</span><select value={props.flexibleDays} onChange={e=>props.setFlexibleDays(Number(e.target.value) as 0|7|30)}><option value={0}>Exact dates</option><option value={7}>± 7 days</option><option value={30}>± 30 days</option></select></label>
    <label><span>Stay</span><select value={props.duration} onChange={e=>props.setDuration(Number(e.target.value) as StayDuration)}>{[30,60,90,120,180].map(d=><option key={d} value={d}>{d} days</option>)}</select></label>
    <label><span>Travelling</span><select value={props.party} onChange={e=>props.setParty(e.target.value as Party)}><option value="solo">Solo</option><option value="couple">Couple</option></select></label>
    <label><span>Region</span><select value={props.region} onChange={e=>props.setRegion(e.target.value as SearchRegion)}><option>All</option><option>Europe</option><option>Asia</option><option>Africa</option><option>Americas</option></select></label>
    <div className="searchBudget"><span>MAX / MONTH</span><b>€{Math.round(props.budget).toLocaleString("en-US")}</b></div>
    <button className="searchCta" onClick={props.onSearch}>Show {props.count} stays</button>
  </div>;
}
