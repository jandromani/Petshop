"use client";

import { useEffect,useMemo,useState } from "react";
import type { Hotel } from "@/src/data/hotels";
import { buildPlan,planTotals,type Party,type PlanMode } from "@/src/core/planner";
import { summarizeFinances,routeHeadroom } from "@/src/core/finance";
import { defaultCheckIn,type SearchRegion,type StayDuration } from "@/src/core/search";
import { growthEvent } from "@/src/growth/client";
import type { HeroVariant } from "@/src/growth/experiments";
import LiveOffers from "@/components/LiveOffers";
import VerifiedRoute from "@/components/VerifiedRoute";
import SilverSearch from "@/components/SilverSearch";
import SilverPromise from "@/components/SilverPromise";
import AdjacencyRail from "@/components/AdjacencyRail";
import RealHotelDirectory,{type DirectoryPayload} from "@/components/RealHotelDirectory";
import AiHotelSearch,{type AiSearchIntent} from "@/components/AiHotelSearch";

const euro=(n:number)=>"€"+Math.round(n).toLocaleString("en-US");

export default function Planner({hotels,heroVariant="freedom",initialDirectory}:{hotels:Hotel[];heroVariant?:HeroVariant;initialDirectory?:DirectoryPayload}){
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
  const [chat,setChat]=useState<{role:"user"|"ai";text:string}[]>([
    {role:"ai",text:"Tell me what the next season of your life should feel like. I can shortlist stays inside the monthly budget you set."}
  ]);
  const [draft,setDraft]=useState("");
  const [thinking,setThinking]=useState(false);
  const [shareLabel,setShareLabel]=useState("Share this life");
  const [directoryCount,setDirectoryCount]=useState(()=>initialDirectory?.total??0);
  const [searchBudgetCap,setSearchBudgetCap]=useState<number|null>(null);
  const [searchAmenities,setSearchAmenities]=useState<string[]>([]);

  const finances=useMemo(()=>summarizeFinances({pension,homeIncome,otherIncome,reserve}),[pension,homeIncome,otherIncome,reserve]);
  const livingBudget=finances.livingBudget;
  const searchBudget=Math.min(livingBudget,searchBudgetCap??livingBudget);

  useEffect(()=>{
    if(reserve>finances.monthlyResources) setReserve(finances.monthlyResources);
  },[finances.monthlyResources,reserve]);

  const plan=useMemo(()=>buildPlan(hotels,livingBudget,party,duration,mode),[hotels,livingBudget,party,duration,mode]);
  const totals=useMemo(()=>planTotals(plan),[plan]);
  const avg=totals.averageMonthly;
  const headroom=useMemo(()=>routeHeadroom(finances,avg),[finances,avg]);


  useEffect(()=>{growthEvent("planner_loaded",{hero_variant:heroVariant});},[heroVariant]);

  function jumpToExplore(){
    growthEvent("hero_search",{query,region,party,duration,budget:searchBudget,check_in:checkIn,flexible_days:flexibleDays,matches:directoryCount,hero_variant:heroVariant});
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
        body:JSON.stringify({prompt,livingBudget:searchBudget,party,duration,mode,checkIn,flexibleDays,query,region}),
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
      <nav className="navlinks"><a href="/stays">Explore stays</a><a href="#planner">Build my year</a><a href="/saved">Saved</a><a href="/trust">Trust</a><a className="navPreview" href="/es" title="Spanish experience preview">ES preview</a><a className="btn" href="#explore">Find a stay →</a></nav>
    </div></header>

    <main id="main-content">
    <section className="hero silverHero consumerHero"><div className="shell consumerHeroGrid"><div className="consumerHeroCopy">
      <div className="eyebrow"><i className="dot"/> LONG-STAY LIVING · 30–365 DAYS</div>
      <h1>Live somewhere better.<br/><em>One month at a time.</em></h1>
      <p className="heroLead">Find real hotels for longer stays, compare by month, and build a year around the life you actually want.</p>
      <SilverSearch query={query} setQuery={setQuery} region={region} setRegion={setRegion} checkIn={checkIn} setCheckIn={setCheckIn} flexibleDays={flexibleDays} setFlexibleDays={setFlexibleDays} duration={duration} setDuration={setDuration} party={party} setParty={setParty} budget={searchBudget} setBudget={v=>{setSearchBudgetCap(v>=livingBudget?null:v);growthEvent("filter_change",{filter:"max_monthly",value:v})}} count={directoryCount} onSearch={jumpToExplore}/>
      <AiHotelSearch current={{region,duration,occupancy:party==="couple"?2:1,maxMonthly:searchBudget}} onApply={(intent:AiSearchIntent)=>{setQuery(intent.query);setRegion(intent.region);setDuration(intent.duration);setParty(intent.occupancy===2?"couple":"solo");setFlexibleDays(intent.flexibleDays);setSearchAmenities(intent.amenities);setSearchBudgetCap(intent.maxMonthly&&intent.maxMonthly<livingBudget?intent.maxMonthly:null);growthEvent("ai_search_navigation",{query:intent.query||"all",region:intent.region,duration:intent.duration});setTimeout(()=>document.getElementById("explore")?.scrollIntoView({behavior:"smooth"}),50);}}/>
      <div className="proof silverProof consumerProof">
        <div className="proofCard"><b>€ / month</b><span>think in months, not nights</span></div>
        <div className="proofCard"><b>30–365 days</b><span>one month, one season or a year</span></div>
        <div className="proofCard"><b>Real hotels</b><span>request any stay we can identify</span></div>
        <div className="proofCard"><b>No invented prices</b><span>prices only appear when verified</span></div>
      </div>
      </div><div className="heroPhotoCard" role="img" aria-label="Tenerife coastline"><div><span>TENERIFE · WINTER SUN</span><b>What if three months<br/>looked like this?</b><a href="/stays?q=Tenerife">Explore Tenerife →</a></div></div>
    </div></section>

    <section className="yearShowcase"><div className="shell yearShowcaseGrid">
      <div><div className="eyebrow">WHAT IF YOU DIDN'T CHOOSE ONE PLACE?</div><h2>Your year abroad.</h2><p>Build a 365-day route around one monthly budget, then change the rhythm until it feels like your life.</p><div className="yearNumbers"><div><span>Average</span><b>{plan.length?euro(avg):"—"}<small>/month est.</small></b></div><div><span>Full year</span><b>{totals.days||0}<small> nights</small></b></div></div><a className="btn lime" href="#planner">Build my year →</a></div>
      <div className="yearTimeline">{plan.slice(0,4).map((s,i)=><div className="yearStop" key={s.stopId}><span>{["JAN–MAR","APR–JUN","JUL–SEP","OCT–DEC"][i]||("STOP "+(i+1))}</span><b>{s.hotel.flag} {s.hotel.city}</b><small>{euro(s.monthlyCost)}/month · {s.days} nights</small></div>)}</div>
    </div></section>

    <section className="travelInspiration"><div className="shell"><div className="sectionTitle"><h2>Places you could<br/>live for a season.</h2><p>Start with a place. If a verified long-stay price exists, Atlas shows it. If not, request one.</p></div><div className="travelTiles"><a href="/stays?q=Tenerife"><b>Tenerife</b><span>Winter sun · Atlantic</span></a><a href="/stays?q=Bali"><b>Bali</b><span>Tropical · slow living</span></a><a href="/stays?q=Madeira"><b>Madeira</b><span>Spring all year</span></a><a href="/stays?q=Antalya"><b>Antalya</b><span>Mediterranean · long stays</span></a></div></div></section>

    <section id="planner" className="dark"><div className="shell">
      <div className="sectionTitle"><h2>Build a year<br/>around your budget.</h2><p>Start with the number that matters: what you can comfortably spend each month.</p></div>
      <div className="grid2">
        <div className="card plannerInputs">
          <div className="plannerPrimaryBudget"><span>You can spend</span><b>{euro(livingBudget)}<small>/month</small></b><p>Change the assumptions below only if you want Atlas to calculate that number for you.</p></div><details className="calculationDetails"><summary>See or change my calculation</summary><div className="calculationDetailsBody">
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
          <div className="control"><div className="label"><span>Stay cadence</span><b>{duration} days</b></div><div className="segment">{([30,60,90,120,180,365] as StayDuration[]).map(d=><button key={d} className={duration===d?"active":""} onClick={()=>setDuration(d)}>{d}d</button>)}</div></div>
          </div></details>
        </div>

        <div className="card">
          <div className="plannerThreeNumbers">
            <div><span>You can spend</span><b>{euro(livingBudget)}<small>/month</small></b></div>
            <div data-testid="route-cost"><span>This plan costs</span><b>{plan.length?euro(avg):"—"}<small>/month est.</small></b></div>
            <div data-testid="total-headroom"><span>You stay under budget by</span><b>{plan.length?euro(headroom.livingBudgetHeadroom):"—"}<small>/month</small></b></div>
          </div>
          <details className="budgetDetails"><summary>See calculation</summary><div className="budgetBreakdown"><div><span>Monthly resources</span><b>{euro(finances.monthlyResources)}</b></div><div><span>Reserve kept untouched</span><b>{euro(finances.reserve)}</b></div><div><span>Total monthly headroom</span><b>{plan.length?euro(headroom.totalMonthlyHeadroom):"—"}</b></div></div></details>
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
      <VerifiedRoute search={{query,region,checkIn,flexibleDays,duration,party,maxMonthly:searchBudget}}/>
    </div></section>

    <LiveOffers/>

    <RealHotelDirectory initialData={initialDirectory} initialQuery={query} initialRegion={region} duration={duration} checkIn={checkIn} occupancy={party==="couple"?2:1} maxMonthly={searchBudget} flexibleDays={flexibleDays} initialAmenities={searchAmenities} onCount={setDirectoryCount} onQueryChange={setQuery} onRegionChange={setRegion}/>

    <section id="agent" className="agentBand"><div className="shell">
      <div className="sectionTitle"><h2>Need help choosing?<br/>Ask Atlas.</h2><p>Describe the life you want and Atlas will help narrow the options without inventing hotel facts or prices.</p></div>
      <div className="agentGrid">
        <div className="chat"><div className="chatlog">{chat.map((m,i)=><div className={"msg "+m.role} key={i}>{m.text}</div>)}</div><div className="chatrow"><input aria-label="Ask Atlas" value={draft} onChange={e=>setDraft(e.target.value)} onKeyDown={e=>e.key==="Enter"&&askAgent()} placeholder="e.g. warm sea, healthcare, under my budget…"/><button className="btn lime" onClick={askAgent}>{thinking?"…":"Ask"}</button></div></div>
        <div className="truth consumerTrustMetrics"><div className="metric"><b>Real</b><span>hotel identities are checked</span></div><div className="metric"><b>Current</b><span>prices need fresh evidence</span></div><div className="metric"><b>Private</b><span>your finance breakdown stays out of concierge prompts</span></div><div className="metric"><b>Clear</b><span>expired prices disappear instead of lingering</span></div></div>
      </div>
    </div></section>

    <AdjacencyRail/>
    <SilverPromise/>
    </main>
    <footer className="footer"><div className="shell footerGrid"><span>ATLAS · LONG-STAY LIVING</span><span>Long stays priced by month. No invented hotel rates.</span><span><a href="/trust">Trust Center</a> · <a href="/legal">Legal</a> · <a href="/privacy">Privacy</a></span></div></footer>
  </>;
}
