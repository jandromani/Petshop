"use client";
import { useCopy } from "@/components/useCopy";

import LanguageSwitch from "@/components/LanguageSwitch";
import { useEffect,useState } from "react";
import { defaultCheckIn,type SearchRegion,type StayDuration } from "@/src/core/search";
import type { Party } from "@/src/core/planner";
import { growthEvent } from "@/src/growth/client";
import type { HeroVariant } from "@/src/growth/experiments";
import LiveOffers from "@/components/LiveOffers";
import VerifiedRoute from "@/components/VerifiedRoute";
import SilverSearch from "@/components/SilverSearch";
import SilverPromise from "@/components/SilverPromise";
import AdjacencyRail from "@/components/AdjacencyRail";
import RealHotelDirectory,{type DirectoryPayload} from "@/components/RealHotelDirectory";
import AiHotelSearch,{type AiSearchIntent } from "@/components/AiHotelSearch";
import StayReadiness from "@/components/StayReadiness";

const euro=(n:number)=>"€"+Math.round(n).toLocaleString("en-US");
const primaryDuration=(d:StayDuration):StayDuration=>d===30||d===60?d:90;

export default function Planner({heroVariant="freedom",initialDirectory}:{heroVariant?:HeroVariant;initialDirectory?:DirectoryPayload}){
  const {t,local,language}=useCopy();
  const [monthlyBudget,setMonthlyBudget]=useState(1800);
  const [party,setParty]=useState<Party>("solo");
  const [duration,setDuration]=useState<StayDuration>(60);
  const [query,setQuery]=useState("");
  const [region,setRegion]=useState<SearchRegion>("All");
  const [checkIn,setCheckIn]=useState(()=>defaultCheckIn());
  const [flexibleDays,setFlexibleDays]=useState<0|7|30>(7);
  const [chat,setChat]=useState<{role:"user"|"ai";text:string}[]>([
    {role:"ai",text:"Tell me where you want to spend the next one to three months. I can narrow real hotels and verified long-stay rates without inventing prices."}
  ]);
  const [draft,setDraft]=useState("");
  const [thinking,setThinking]=useState(false);
  const [directoryCount,setDirectoryCount]=useState(()=>initialDirectory?.total??0);
  const [searchBudgetCap,setSearchBudgetCap]=useState<number|null>(null);
  const [searchAmenities,setSearchAmenities]=useState<string[]>([]);
  const searchBudget=Math.min(monthlyBudget,searchBudgetCap??monthlyBudget);

  useEffect(()=>{growthEvent("planner_loaded",{hero_variant:heroVariant,product_wedge:"30-90"});},[heroVariant]);

  function jumpToExplore(){
    growthEvent("hero_search",{query,region,party,duration,budget:searchBudget,check_in:checkIn,flexible_days:flexibleDays,matches:directoryCount,hero_variant:heroVariant});
    document.getElementById("explore")?.scrollIntoView({behavior:"smooth"});
  }

  async function askAgent(){
    const prompt=draft.trim();
    if(!prompt||thinking)return;
    growthEvent("agent_question",{party,duration,budget:monthlyBudget});
    setChat(v=>[...v,{role:"user",text:prompt}]);setDraft("");setThinking(true);
    try{
      const res=await fetch("/api/agent",{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({prompt,language,livingBudget:searchBudget,party,duration,mode:"winter",checkIn,flexibleDays,query,region})});
      const data=await res.json();
      setChat(v=>[...v,{role:"ai",text:data.answer||data.error||t("Agent temporarily unavailable.")}]);
    }catch{
      setChat(v=>[...v,{role:"ai",text:"Agent temporarily unavailable. Search and sourcing are still available."}]);
    }finally{setThinking(false);}
  }

  return <>
    <header className="nav"><div className="shell navin">
      <a className="brand" href="#">{t("ATLAS")}<span>{t("LONG STAY")}</span></a>
      <nav className="navlinks"><LanguageSwitch/><a href={local("/saved")}>{t("Saved")}</a><a href={local("/requests")}>{t("My requests")}</a><a href={local("/stays")}>{t("Explore stays")}</a><a href="#how">{t("How it works")}</a><a href={local("/stay-readiness")}>{t("Stay readiness")}</a><a href={local("/for-hotels")}>{t("For hotels")}</a><a href={local("/trust")}>{t("Trust")}</a><a className="btn" href="#explore">{t("Find a stay →")}</a></nav>
    </div></header>

    <main id="main-content">
      <section className="hero silverHero consumerHero"><div className="shell consumerHeroGrid"><div className="consumerHeroCopy">
        <div className="eyebrow"><i className="dot"/> {t("HOTEL LIVING · 30–90 DAYS")}</div>
        <h1>{t("Live somewhere better.")}<br/><em>{t("For a month or a season.")}</em></h1>
        <p className="heroLead">{t("Search real hotels for 30, 60 or 90 days. See a current price only when Atlas can verify it; otherwise request a private long-stay rate for your dates.")}</p>
        <SilverSearch query={query} setQuery={setQuery} region={region} setRegion={setRegion} checkIn={checkIn} setCheckIn={setCheckIn} flexibleDays={flexibleDays} setFlexibleDays={setFlexibleDays} duration={duration} setDuration={d=>setDuration(primaryDuration(d))} party={party} setParty={setParty} budget={searchBudget} setBudget={v=>{setMonthlyBudget(v);setSearchBudgetCap(null);growthEvent("filter_change",{filter:"max_monthly",value:v})}} count={directoryCount} onSearch={jumpToExplore}/>
        <AiHotelSearch current={{region,duration,occupancy:party==="couple"?2:1,maxMonthly:searchBudget}} onApply={(intent:AiSearchIntent)=>{const d=primaryDuration(intent.duration);setQuery(intent.query);setRegion(intent.region);setDuration(d);setParty(intent.occupancy===2?"couple":"solo");setFlexibleDays(intent.flexibleDays);setSearchAmenities(intent.amenities);setSearchBudgetCap(intent.maxMonthly&&intent.maxMonthly<monthlyBudget?intent.maxMonthly:null);growthEvent("ai_search_navigation",{query:intent.query||"all",region:intent.region,duration:d});setTimeout(()=>document.getElementById("explore")?.scrollIntoView({behavior:"smooth"}),50);}}/>
        <div className="proof silverProof consumerProof">
          <div className="proofCard"><b>30 / 60 / 90</b><span>{t("one destination, one season")}</span></div>
          <div className="proofCard"><b>{t("€ / month")}</b><span>{t("compare the cost that actually matters")}</span></div>
          <div className="proofCard"><b>{t("Verified or requested")}</b><span>{t("supply is never implied by a hotel listing")}</span></div>
          <div className="proofCard"><b>{t("No invented prices")}</b><span>{t("unknown means unknown")}</span></div>
        </div>
      </div><div className="heroPhotoCard" role="img" aria-label={t("Tenerife coastline")}><div><span>{t("FOCUS MARKET · CANARY ISLANDS")}</span><b>{t("Start with one")}<br/>{t("winter season.")}</b><a href={local("/stays?q=Tenerife&duration=60")}>{t("Explore Tenerife →")}</a></div></div>
      </div></section>

      <section className="wedgeBand"><div className="shell wedgeGrid">
        <div><div className="eyebrow">{t("YOUR NEXT SEASON")}</div><h2>{t("One destination.")}<br/>{t("One monthly budget.")}<br/>{t("One real stay.")}</h2><p>{t("Choose one place for 30, 60 or 90 days. Start with a winter season in the Canary Islands.")}</p></div>
        <div className="wedgeCards">
          <a href={local("/monthly-stays/tenerife")}><span>{t("30 DAYS")}</span><b>{t("Try a month")}</b><small>{t("Tenerife")}</small></a>
          <a href={local("/monthly-stays/gran-canaria")}><span>{t("60 DAYS")}</span><b>{t("Spend a season")}</b><small>{t("Gran Canaria")}</small></a>
          <a href={local("/stays?q=Canary%20Islands&duration=90")}><span>{t("90 DAYS")}</span><b>{t("Move for winter")}</b><small>{t("Canary Islands")}</small></a>
        </div>
      </div></section>

      <section id="how" className="commercialLoop"><div className="shell">
        <div className="sectionTitle"><h2>{t("Find your place.")}<br/>{t("We help with the next step.")}</h2><p>{t("Explore real hotels, review current rates when available and request a quote for your dates.")}</p></div>
        <div className="loopGrid">
          <article><span>01</span><h3>{t("Search")}</h3><p>{t("Choose a destination, dates and a monthly budget.")}</p></article>
          <article><span>02</span><h3>{t("Verify")}</h3><p>{t("Review the price and conditions when a verified rate is available.")}</p></article>
          <article><span>03</span><h3>{t("Source")}</h3><p>{t("Request a rate for your hotel and dates when no current price is available.")}</p></article>
          <article><span>04</span><h3>{t("Convert")}</h3><p>{t("Review your quote and booking conditions before deciding.")}</p></article>
        </div>
      </div></section>

      <section id="planner" className="dark"><div className="shell">
        <div className="sectionTitle"><h2>{t("Set your monthly ceiling.")}<br/>{t("Find a place that fits.")}</h2><p>{t("Set a comfortable accommodation budget. The final price depends on your dates and the hotel.")}</p></div>
        <div className="budgetWedge card">
          <div><span>{t("MAX ACCOMMODATION BUDGET")}</span><b data-testid="monthly-budget">{euro(monthlyBudget)}<small>{t("/month")}</small></b><p>{t("Salary, pension, investment income or savings all reduce to one neutral input: what you are comfortable spending on accommodation each month.")}</p></div>
          <label><span>{t("Monthly budget")}</span><input aria-label={t("Monthly accommodation budget")} inputMode="numeric" value={monthlyBudget} onChange={e=>{const v=Math.max(300,Number(e.target.value.replace(/[^0-9]/g,""))||300);setMonthlyBudget(v);setSearchBudgetCap(null)}}/></label>
          <div className="seasonDuration"><span>{t("Stay length")}</span>{([30,60,90] as StayDuration[]).map(d=><button key={d} className={duration===d?"active":""} onClick={()=>setDuration(d)}>{d} {t("days")}</button>)}</div>
        </div>
        <VerifiedRoute search={{query,region,checkIn,flexibleDays,duration,party,maxMonthly:searchBudget}}/>
      </div></section>

      <LiveOffers/>

      <RealHotelDirectory initialData={initialDirectory} initialQuery={query} initialRegion={region} duration={duration} checkIn={checkIn} occupancy={party==="couple"?2:1} maxMonthly={searchBudget} flexibleDays={flexibleDays} initialAmenities={searchAmenities} onCount={setDirectoryCount} onQueryChange={setQuery} onRegionChange={setRegion}/>

      <section className="commercialLoop"><div className="shell">
        <div className="sectionTitle"><h2>{t("Search by the month.")}<br/>{t("Decide with evidence.")}</h2><p>{t("Atlas keeps the long-stay journey simple: compare the monthly cost, request a private rate when public inventory is missing, and keep stay-readiness visible before you book.")}</p></div>
        <div className="loopGrid">
          <article><span>01</span><h3>{t("Monthly-first")}</h3><p>{t("Compare 30, 60 and 90-day stays using the cost that matters for a long stay.")}</p></article>
          <article><span>02</span><h3>{t("Private rate request")}</h3><p>{t("If a current rate is missing, request a quote for your exact hotel, dates and stay length.")}</p></article>
          <article><span>03</span><h3>{t("Stay readiness")}</h3><p>{t("Immigration and tax-day constraints stay separate from accommodation so a hotel result is never treated as permission to stay.")}</p></article>
          <article><span>04</span><h3>{t("Evidence first")}</h3><p>{t("Prices appear only while the underlying commercial evidence is current. Expired evidence disappears.")}</p></article>
        </div>
        <p className="directoryDisclosure"><b>{t("Search is free.")}</b> {t("Private long-stay rate requests are free too; Atlas only earns when an eligible accommodation transaction converts.")}</p><div className="actions"><a className="btn ghost" href={local("/about")}>{t("How Atlas works →")}</a><a className="btn ghost" href={local("/for-hotels")}>{t("For hotels →")}</a></div>
      </div></section>

      <StayReadiness duration={duration}/>

      <section id="agent" className="agentBand"><div className="shell">
        <div className="sectionTitle"><h2>{t("Need help narrowing it down?")}<br/>{t("Ask Atlas.")}</h2><p>{t("Describe the stay you want. Atlas turns your intent into search filters while hotel facts, prices and availability remain evidence-gated.")}</p></div>
        <div className="agentGrid">
          <div className="chat"><div className="chatlog">{chat.map((m,i)=><div className={"msg "+m.role} key={i}>{m.role==="ai"?t(m.text):m.text}</div>)}</div><div className="chatrow"><input aria-label={t("Ask Atlas")} value={draft} onChange={e=>setDraft(e.target.value)} onKeyDown={e=>e.key==="Enter"&&askAgent()} placeholder={t("e.g. Tenerife, walkable, sea, under €1,800/month…")}/><button className="btn lime" onClick={askAgent}>{thinking?"…":t("Ask")}</button></div></div>
          <div className="truth consumerTrustMetrics"><div className="metric"><b>{t("Real property")}</b><span>{t("hotel identity is kept separate from availability")}</span></div><div className="metric"><b>{t("Current price")}</b><span>{t("prices require fresh commercial evidence")}</span></div><div className="metric"><b>{t("Private request")}</b><span>{t("ask Atlas to source an unpriced stay")}</span></div><div className="metric"><b>{t("Fresh by default")}</b><span>{t("expired price evidence disappears")}</span></div></div>
        </div>
      </div></section>

      <AdjacencyRail/>
      <SilverPromise/>
    </main>
    <footer className="footer"><div className="shell footerGrid"><span>{t("ATLAS · LONG-STAY LIVING")}</span><span>{t("30–90 day hotel stays. Verified rates or private sourcing.")}</span><span><a href={local("/about")}>{t("About")}</a> · <a href={local("/for-hotels")}>{t("For hotels")}</a> · <a href={local("/stay-readiness")}>{t("Stay readiness")}</a> · <a href={local("/trust")}>{t("Trust")}</a> · <a href={local("/legal")}>{t("Legal")}</a></span></div></footer>
  </>;
}
