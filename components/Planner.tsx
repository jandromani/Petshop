"use client";

import { useEffect,useMemo,useState } from "react";
import type { Hotel } from "@/src/data/hotels";
import { adjustedMonthly,buildPlan,planTotals,type Party,type PlanMode } from "@/src/core/planner";
import { summarizeFinances,routeHeadroom } from "@/src/core/finance";
import { defaultCheckIn,filterDemoHotels,type SearchRegion,type StayDuration } from "@/src/core/search";
import { growthEvent } from "@/src/growth/client";
import type { HeroVariant } from "@/src/growth/experiments";
import WorldMap from "@/components/WorldMap";
import LiveOffers from "@/components/LiveOffers";
import VerifiedRoute from "@/components/VerifiedRoute";
import SilverSearch from "@/components/SilverSearch";
import SilverHotelCard from "@/components/SilverHotelCard";
import SilverPromise from "@/components/SilverPromise";
import AdjacencyRail from "@/components/AdjacencyRail";

const euro=(n:number)=>"€"+Math.round(n).toLocaleString("en-US");

export default function Planner({hotels,heroVariant="freedom"}:{hotels:Hotel[];heroVariant?:HeroVariant}){
  const [pension,setPension]=useState(1700);
  const [homeIncome,setHomeIncome]=useState(1300);
  const [otherIncome,setOtherIncome]=useState(200);
  const [reserve,setReserve]=useState(1150);
  const [party,setParty]=useState<Party>("solo");
  const [duration,setDuration]=useState<StayDuration>(90);
  const [mode,setMode]=useState<PlanMode>("world");
  const [query,setQuery]=useState("");
  const [region,setRegion]=useState<SearchRegion>("All");
  const [checkIn,setCheckIn]=useState(()=>defaultCheckIn());
  const [flexibleDays,setFlexibleDays]=useState<0|7|30>(7);
  const [sort,setSort]=useState("value");
  const [chat,setChat]=useState<{role:"user"|"ai";text:string}[]>([
    {role:"ai",text:"Tell me what the next season of your life should feel like. I can shortlist stays inside the monthly budget you set."}
  ]);
  const [draft,setDraft]=useState("");
  const [thinking,setThinking]=useState(false);
  const [shareLabel,setShareLabel]=useState("Share this life");

  const finances=useMemo(()=>summarizeFinances({pension,homeIncome,otherIncome,reserve}),[pension,homeIncome,otherIncome,reserve]);
  const livingBudget=finances.livingBudget;

  useEffect(()=>{
    if(reserve>finances.monthlyResources) setReserve(finances.monthlyResources);
  },[finances.monthlyResources,reserve]);

  const plan=useMemo(()=>buildPlan(hotels,livingBudget,party,duration,mode),[hotels,livingBudget,party,duration,mode]);
  const totals=useMemo(()=>planTotals(plan),[plan]);
  const avg=totals.averageMonthly;
  const headroom=useMemo(()=>routeHeadroom(finances,avg),[finances,avg]);

  const matching=useMemo(()=>filterDemoHotels(hotels,{query,region,checkIn,flexibleDays,duration,party,maxMonthly:livingBudget}),[hotels,query,region,checkIn,flexibleDays,duration,party,livingBudget]);
  const visible=useMemo(()=>[...matching].sort((a,b)=>sort==="price"
    ? adjustedMonthly(a,party)-adjustedMonthly(b,party)
    : sort==="score"
      ? b.score-a.score
      : (b.score/adjustedMonthly(b,party))-(a.score/adjustedMonthly(a,party))
  ),[matching,sort,party]);

  useEffect(()=>{growthEvent("planner_loaded",{catalogue_size:hotels.length,hero_variant:heroVariant});},[hotels.length,heroVariant]);

  function jumpToExplore(){
    growthEvent("hero_search",{query,region,party,duration,budget:livingBudget,check_in:checkIn,flexible_days:flexibleDays,matches:matching.length});
    document.getElementById("explore")?.scrollIntoView({behavior:"smooth"});
  }

  async function sharePlan(){
    setShareLabel("Creating…");
    try{
      const res=await fetch("/api/share-plan",{
        method:"POST",headers:{"content-type":"application/json"},
        body:JSON.stringify({monthlyBudget:livingBudget,party,duration,mode,checkIn,flexibleDays}),
      });
      const data=await res.json();
      if(!res.ok||!data?.url) throw new Error(data?.error||"share-unavailable");
      const url=new URL(data.url,window.location.origin).toString();
      growthEvent("route_shared",{mode,party,duration,budget:livingBudget});
      const canNativeShare="share" in navigator&&typeof navigator.share==="function";
      if(canNativeShare) await navigator.share({title:"Could you live like this?",text:"My Atlas long-stay route",url});
      else await navigator.clipboard.writeText(url);
      setShareLabel(canNativeShare?"Shared ✓":"Link copied ✓");
    }catch{
      setShareLabel("Sharing activates with DB");
    }
  }

  async function askAgent(){
    const prompt=draft.trim();
    if(!prompt||thinking)return;
    growthEvent("agent_question",{mode,party,duration,budget:livingBudget});
    setChat(v=>[...v,{role:"user",text:prompt}]);
    setDraft("");setThinking(true);
    try{
      const res=await fetch("/api/agent",{
        method:"POST",headers:{"content-type":"application/json"},
        body:JSON.stringify({prompt,livingBudget,party,duration,mode,checkIn,flexibleDays,query,region}),
      });
      const data=await res.json();
      setChat(v=>[...v,{role:"ai",text:data.answer||data.error||"Agent temporarily unavailable."}]);
    }catch{
      setChat(v=>[...v,{role:"ai",text:"Agent temporarily unavailable. The deterministic planner is still working."}]);
    }finally{setThinking(false);}
  }

  return <>
    <header className="nav"><div className="shell navin">
      <a className="brand" href="#">ATLAS<span>LONG STAY</span></a>
      <nav className="navlinks"><a href="/es">ES</a><a href="/saved">Saved</a><a href="#explore">Stays</a><a href="#planner">Build my year</a><a href="#agent">Ask Atlas</a><a className="btn" href="#explore">Find a stay →</a></nav>
    </div></header>

    <main id="main-content">
    <section className="hero silverHero"><div className="shell">
      <div className="eyebrow"><i className="dot"/> LONG-STAY HOTEL LIVING · 30–180 DAYS</div>
      <h1>Live somewhere better.<br/><em>Stay for a season.</em></h1>
      <p className="heroLead">Compare long-stay hotels by monthly cost, not nightly rate. Build a flexible life around the budget you already have.</p>
      <SilverSearch query={query} setQuery={setQuery} region={region} setRegion={setRegion} checkIn={checkIn} setCheckIn={setCheckIn} flexibleDays={flexibleDays} setFlexibleDays={setFlexibleDays} duration={duration} setDuration={setDuration} party={party} setParty={setParty} budget={livingBudget} count={matching.length} onSearch={jumpToExplore}/>
      <div className="proof silverProof">
        <div className="proofCard"><b>€ / month</b><span>compare living cost, not a weekend</span></div>
        <div className="proofCard"><b>30–180 days</b><span>one month, one season or longer</span></div>
        <div className="proofCard"><b>365 days</b><span>the generated annual route covers a full year</span></div>
        <div className="proofCard"><b>Truth-gated</b><span>verified offers stay separate from demos</span></div>
      </div>
    </div></section>

    <section className="howBand"><div className="shell howGrid">
      <div><span>01</span><b>Add what comes in every month</b><p>Pension + net home income + other recurring income are summed before anything else.</p></div>
      <div><span>02</span><b>Choose what you keep untouched</b><p>Your reserve is explicit. Everything left is your maximum monthly living budget.</p></div>
      <div><span>03</span><b>See only what actually fits</b><p>If a stay or route exceeds that budget, Atlas does not present it as affordable.</p></div>
    </div></section>

    <section id="planner" className="dark"><div className="shell">
      <div className="sectionTitle"><h2>Build your<br/>living budget.</h2><p>The arithmetic is explicit: resources in, reserve kept, maximum available to live, and actual route cost.</p></div>
      <WorldMap hotels={hotels} route={plan.map(s=>s.hotel)}/>
      <div className="grid2">
        <div className="card">
          {[
            ["Monthly pension",pension,setPension,0,6000],
            ["Net income from home",homeIncome,setHomeIncome,0,6000],
            ["Other recurring income",otherIncome,setOtherIncome,0,4000],
          ].map(([label,value,setter,min,max])=><div className="control" key={String(label)}>
            <div className="label"><span>{String(label)}</span><b>{euro(Number(value))}</b></div>
            <input aria-label={String(label)} type="range" min={Number(min)} max={Number(max)} step="50" value={Number(value)} onChange={e=>(setter as (x:number)=>void)(Number(e.target.value))}/>
          </div>)}
          <div className="financeSummary" data-testid="monthly-resources">
            <div><span>MONTHLY RESOURCES</span><b>{euro(finances.monthlyResources)}</b></div>
            <div className="financePlus">pension + home + other</div>
          </div>
          <div className="control">
            <div className="label"><span>Keep untouched every month</span><b>{euro(finances.reserve)}</b></div>
            <input data-testid="reserve-slider" aria-label="Keep untouched every month" type="range" min="0" max={Math.max(0,finances.monthlyResources)} step="50" value={Math.min(reserve,finances.monthlyResources)} onChange={e=>setReserve(Number(e.target.value))}/>
          </div>
          <div className="financeBudget" data-testid="living-budget"><span>MAXIMUM AVAILABLE TO LIVE</span><b>{euro(livingBudget)}<small>/month</small></b></div>
          <div className="control"><div className="label"><span>Travelling as</span><b>{party}</b></div><div className="segment"><button className={party==="solo"?"active":""} onClick={()=>setParty("solo")}>Solo</button><button className={party==="couple"?"active":""} onClick={()=>setParty("couple")}>Couple</button></div></div>
          <div className="control"><div className="label"><span>Stay cadence</span><b>{duration} days</b></div><div className="segment">{([30,60,90,120,180] as StayDuration[]).map(d=><button key={d} className={duration===d?"active":""} onClick={()=>setDuration(d)}>{d}d</button>)}</div></div>
        </div>

        <div className="card">
          <div className="moneyline">
            <div data-testid="route-cost"><div className="label"><span>ACTUAL ROUTE COST</span></div><div className="money">{plan.length?euro(avg):"—"}<small>/month est.</small></div></div>
            <div className="surplus" data-testid="total-headroom"><span>left after route</span><b>{plan.length?euro(headroom.totalMonthlyHeadroom):"—"}</b></div>
          </div>
          <div className="budgetBreakdown">
            <div><span>Maximum living budget</span><b>{euro(livingBudget)}</b></div>
            <div><span>Unused inside living budget</span><b>{plan.length?euro(headroom.livingBudgetHeadroom):"—"}</b></div>
            <div><span>Monthly reserve kept untouched</span><b>{euro(finances.reserve)}</b></div>
          </div>
          <div className="actions">{([["world","World tour"],["winter","Winter sun"],["value","Max value"],["slow","Slow Europe"]] as [PlanMode,string][]).map(([m,l])=><button className={"btn "+(mode===m?"lime":"ghost")} key={m} onClick={()=>{setMode(m);growthEvent("route_strategy_selected",{mode:m,budget:livingBudget,party,duration});}}>{l}</button>)}</div>
          <div className="actions"><button className="btn lime" onClick={sharePlan} disabled={!plan.length}>{shareLabel}</button></div>
          <div className="route">
            {!plan.length&&<div className="noRoute"><b>No route fits this budget yet.</b><span>Increase the available monthly budget or switch the traveller profile. Atlas will not silently overspend.</span></div>}
            {plan.slice(0,6).map((s,i)=><div className="stop" key={s.stopId}>
              <div className="when">STOP {String(i+1).padStart(2,"0")}</div>
              <div><b>{s.hotel.flag} {s.hotel.city}</b><small>{s.days} nights · {s.hotel.board} · effective {euro(s.effectiveMonthly)}/mo{s.transportMode!=="start"&&s.transportMode!=="stay"?" · "+s.transportMode+" ~"+s.transportDistanceKm.toLocaleString()+" km / "+euro(s.transport):""}</small></div>
              <div className="cost">{euro(s.monthlyCost)}/mo</div>
            </div>)}
          </div>
          <div className="label" style={{marginTop:14}}><span>{totals.days||0} nights · mobility estimate {euro(totals.transportTotal)}</span><b>{plan.length?euro(totals.total)+" total":"No affordable annual route"}</b></div>
        </div>
      </div>
      <VerifiedRoute search={{query,region,checkIn,flexibleDays,duration,party,maxMonthly:livingBudget}}/>
    </div></section>

    <LiveOffers/>

    <section id="explore" className="discovery"><div className="shell">
      <div className="sectionTitle"><h2>{visible.length} long-stay stays<br/>inside your budget.</h2><p>Every demo result below respects the same budget, region, traveller and text filters as the search count above.</p></div>
      <div className="toolbar">
        <input aria-label="Filter stays" value={query} onChange={e=>setQuery(e.target.value)} placeholder="Search city, country, pool, sea, clinic…"/>
        <select aria-label="Filter stays by region" value={region} onChange={e=>setRegion(e.target.value as SearchRegion)}><option>All</option><option>Europe</option><option>Asia</option><option>Africa</option><option>Americas</option></select>
        <select aria-label="Sort stays" value={sort} onChange={e=>setSort(e.target.value)}><option value="value">Best value</option><option value="price">Lowest monthly</option><option value="score">Silver score</option></select>
      </div>
      <div className="hotels">{visible.map(h=><SilverHotelCard key={h.id} hotel={h} party={party} duration={duration}/>)}</div>
    </div></section>

    <section id="agent" className="agentBand"><div className="shell">
      <div className="sectionTitle"><h2>Ask Atlas.<br/>Your long-stay concierge.</h2><p>The concierge receives only the budget and travel preferences it needs—not your pension or home-income breakdown.</p></div>
      <div className="agentGrid">
        <div className="chat"><div className="chatlog">{chat.map((m,i)=><div className={"msg "+m.role} key={i}>{m.text}</div>)}</div><div className="chatrow"><input aria-label="Ask Atlas" value={draft} onChange={e=>setDraft(e.target.value)} onKeyDown={e=>e.key==="Enter"&&askAgent()} placeholder="e.g. warm sea, healthcare, under my budget…"/><button className="btn lime" onClick={askAgent}>{thinking?"…":"Ask"}</button></div></div>
        <div className="truth"><div className="metric"><b>{hotels.length}</b><span>demo catalogue records</span></div><div className="metric"><b>3</b><span>live provider adapters</span></div><div className="metric"><b>365</b><span>days in generated year</span></div><div className="metric"><b>0</b><span>LLM-written prices allowed</span></div><div className="metric"><b>5</b><span>stay cadences</span></div><div className="metric"><b>1</b><span>budget truth shared across search + route</span></div></div>
      </div>
    </div></section>

    <AdjacencyRail/>
    <SilverPromise/>
    </main>
    <footer className="footer"><div className="shell footerGrid"><span>ATLAS · LONG-STAY LIVING</span><span>Prototype and live commercial inventory remain explicitly separated.</span><span><a href="/system">System proof</a> · <a href="/legal">Commercial & data disclosure</a></span></div></footer>
  </>;
}
