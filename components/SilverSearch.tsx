"use client";
import { useCopy } from "@/components/useCopy";
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
  const {t,local,language}=useCopy();
  return <div className="consumerSearch">
    <div className="consumerSearchPrimary">
      <label><span>{t("Where for your next season?")}</span><input aria-label={t("Destination or hotel")} value={props.query} onChange={e=>props.setQuery(e.target.value)} placeholder={t("Tenerife, Gran Canaria, Madeira…")}/></label>
      <label><span>{t("When?")}</span><input type="date" value={props.checkIn} onChange={e=>{props.setCheckIn(e.target.value);growthEvent("filter_change",{filter:"check_in",value:e.target.value})}}/></label>
      <label><span>{t("How long?")}</span><select aria-label={t("Stay duration")} value={props.duration} onChange={e=>{const v=Number(e.target.value) as StayDuration;props.setDuration(v);growthEvent("filter_change",{filter:"duration",value:v})}}>{[30,60,90].map(d=><option key={d} value={d}>{d} {t("days")}</option>)}</select></label>
      <button className="searchCta" onClick={props.onSearch}>{t("Find long stays →")}</button>
    </div>
    <details className="searchMore">
      <summary>{t("More options")} <span>{t("budget · guests · flexibility · region")}</span></summary>
      <div className="searchMoreGrid">
        <label><span>{t("Date flexibility")}</span><select value={props.flexibleDays} onChange={e=>{const v=Number(e.target.value) as 0|7|30;props.setFlexibleDays(v);growthEvent("filter_change",{filter:"flexible_days",value:v})}}><option value={0}>{t("Exact dates")}</option><option value={7}>{t("± 7 days")}</option><option value={30}>{t("± 30 days")}</option></select></label>
        <label><span>{t("Guests")}</span><select aria-label={t("Travelling party")} value={props.party} onChange={e=>{const v=e.target.value as Party;props.setParty(v);growthEvent("filter_change",{filter:"party",value:v})}}><option value="solo">{t("1 guest")}</option><option value="couple">{t("2 guests")}</option></select></label>
        <label><span>{t("Region")}</span><select aria-label={t("Region")} value={props.region} onChange={e=>{const v=e.target.value as SearchRegion;props.setRegion(v);growthEvent("filter_change",{filter:"region",value:v})}}><option value="All">{t("All")}</option><option value="Europe">{t("Europe")}</option><option value="Asia">{t("Asia")}</option><option value="Africa">{t("Africa")}</option><option value="Americas">{t("Americas")}</option></select></label>
        <label className="searchBudget"><span>{t("Max / month")}</span><input aria-label={t("Maximum monthly hotel budget")} inputMode="numeric" value={Math.round(props.budget)} onChange={e=>props.setBudget(Math.max(1,Number(e.target.value.replace(/[^0-9]/g,""))||1))}/></label>
      </div>
    </details>
    <small className="searchInventoryHint">{props.count>0?props.count.toLocaleString(language)+t(" hotels to explore. Rates and availability are checked separately."):t("Choose a hotel and request a rate for your dates.")}</small>
  </div>;
}
