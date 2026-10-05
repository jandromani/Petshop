"use client";

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
      const res=await fetch("/api/agent",{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({prompt,livingBudget:searchBudget,party,duration,mode:"winter",checkIn,flexibleDays,query,region})});
      const data=await res.json();
      setChat(v=>[...v,{role:"ai",text:data.answer||data.error||"Agent temporarily unavailable."}]);
    }catch{
      setChat(v=>[...v,{role:"ai",text:"Agent temporarily unavailable. Search and sourcing are still available."}]);
    }finally{setThinking(false);}
  }

  return <>
    <header className="nav"><div className="shell navin">
      <a className="brand" href="#">ATLAS<span>LONG STAY</span></a>
      <nav className="navlinks"><a href="/stays">Explore stays</a><a href="#how">How it works</a><a href="/stay-readiness">Stay readiness</a><a href="/for-hotels">For hotels</a><a href="/trust">Trust</a><a className="btn" href="#explore">Find a stay →</a></nav>
    </div></header>

    <main id="main-content">
      <section className="hero silverHero consumerHero"><div className="shell consumerHeroGrid"><div className="consumerHeroCopy">
        <div className="eyebrow"><i className="dot"/> HOTEL LIVING · 30–90 DAYS</div>
        <h1>Live somewhere better.<br/><em>For a month or a season.</em></h1>
        <p className="heroLead">Search real hotels for 30, 60 or 90 days. See a current price only when Atlas can verify it; otherwise request a private long-stay rate for your dates.</p>
        <SilverSearch query={query} setQuery={setQuery} region={region} setRegion={setRegion} checkIn={checkIn} setCheckIn={setCheckIn} flexibleDays={flexibleDays} setFlexibleDays={setFlexibleDays} duration={duration} setDuration={d=>setDuration(primaryDuration(d))} party={party} setParty={setParty} budget={searchBudget} setBudget={v=>{setMonthlyBudget(v);setSearchBudgetCap(null);growthEvent("filter_change",{filter:"max_monthly",value:v})}} count={directoryCount} onSearch={jumpToExplore}/>
        <AiHotelSearch current={{region,duration,occupancy:party==="couple"?2:1,maxMonthly:searchBudget}} onApply={(intent:AiSearchIntent)=>{const d=primaryDuration(intent.duration);setQuery(intent.query);setRegion(intent.region);setDuration(d);setParty(intent.occupancy===2?"couple":"solo");setFlexibleDays(intent.flexibleDays);setSearchAmenities(intent.amenities);setSearchBudgetCap(intent.maxMonthly&&intent.maxMonthly<monthlyBudget?intent.maxMonthly:null);growthEvent("ai_search_navigation",{query:intent.query||"all",region:intent.region,duration:d});setTimeout(()=>document.getElementById("explore")?.scrollIntoView({behavior:"smooth"}),50);}}/>
        <div className="proof silverProof consumerProof">
          <div className="proofCard"><b>30 / 60 / 90</b><span>one destination, one season</span></div>
          <div className="proofCard"><b>€ / month</b><span>compare the cost that actually matters</span></div>
          <div className="proofCard"><b>Verified or requested</b><span>supply is never implied by a hotel listing</span></div>
          <div className="proofCard"><b>No invented prices</b><span>unknown means unknown</span></div>
        </div>
      </div><div className="heroPhotoCard" role="img" aria-label="Tenerife coastline"><div><span>FOCUS MARKET · CANARY ISLANDS</span><b>Start with one<br/>winter season.</b><a href="/stays?q=Tenerife&duration=60">Explore Tenerife →</a></div></div>
      </div></section>

      <section className="wedgeBand"><div className="shell wedgeGrid">
        <div><div className="eyebrow">THE WEDGE</div><h2>One destination.<br/>One monthly budget.<br/>One real stay.</h2><p>Atlas is deliberately not starting as a global year-long itinerary product. The consumer wedge is a 30–90 day hotel stay, with winter-sun demand as the first commercial focus.</p></div>
        <div className="wedgeCards">
          <a href="/stays?q=Tenerife&duration=30"><span>30 DAYS</span><b>Try a month</b><small>Tenerife</small></a>
          <a href="/stays?q=Gran%20Canaria&duration=60"><span>60 DAYS</span><b>Spend a season</b><small>Gran Canaria</small></a>
          <a href="/stays?q=Canary%20Islands&duration=90"><span>90 DAYS</span><b>Move for winter</b><small>Canary Islands</small></a>
        </div>
      </div></section>

      <section id="how" className="commercialLoop"><div className="shell">
        <div className="sectionTitle"><h2>Discovery is not supply.<br/>Atlas closes the loop.</h2><p>A hotel identity can be searchable without being bookable. Atlas only calls something supply after a current commercial rate has evidence behind it.</p></div>
        <div className="loopGrid">
          <article><span>01</span><h3>Search</h3><p>Find real hotel identities that fit the place, dates and monthly budget.</p></article>
          <article><span>02</span><h3>Verify</h3><p>If Atlas has current sellable evidence, the rate appears immediately.</p></article>
          <article><span>03</span><h3>Source</h3><p>If not, create a private-rate request. Atlas tries connected providers and Direct Hotel OS.</p></article>
          <article><span>04</span><h3>Convert</h3><p>A verified quote returns to the traveller and the commercial partner completes the booking.</p></article>
        </div>
      </div></section>

      <section id="planner" className="dark"><div className="shell">
        <div className="sectionTitle"><h2>Set your monthly ceiling.<br/>Then source the stay.</h2><p>This is a search constraint, not a fabricated hotel quote.</p></div>
        <div className="budgetWedge card">
          <div><span>MAX ACCOMMODATION BUDGET</span><b data-testid="monthly-budget">{euro(monthlyBudget)}<small>/month</small></b><p>Salary, pension, investment income or savings all reduce to one neutral input: what you are comfortable spending on accommodation each month.</p></div>
          <label><span>Monthly budget</span><input aria-label="Monthly accommodation budget" inputMode="numeric" value={monthlyBudget} onChange={e=>{const v=Math.max(300,Number(e.target.value.replace(/[^0-9]/g,""))||300);setMonthlyBudget(v);setSearchBudgetCap(null)}}/></label>
          <div className="seasonDuration"><span>Stay length</span>{([30,60,90] as StayDuration[]).map(d=><button key={d} className={duration===d?"active":""} onClick={()=>setDuration(d)}>{d} days</button>)}</div>
        </div>
        <VerifiedRoute search={{query,region,checkIn,flexibleDays,duration,party,maxMonthly:searchBudget}}/>
      </div></section>

      <LiveOffers/>

      <RealHotelDirectory initialData={initialDirectory} initialQuery={query} initialRegion={region} duration={duration} checkIn={checkIn} occupancy={party==="couple"?2:1} maxMonthly={searchBudget} flexibleDays={flexibleDays} initialAmenities={searchAmenities} onCount={setDirectoryCount} onQueryChange={setQuery} onRegionChange={setRegion}/>

      <section className="economicsBand"><div className="shell">
        <div className="economicsGrid"><div><div className="eyebrow">BUSINESS MODEL</div><h2>Affiliate is a bridge.<br/>Managed supply is the destination.</h2></div><div><p>Provider redirects can bootstrap coverage. The higher-control path is direct 30–90 day inventory with a contractual hotel net, an Atlas customer price, allocated units and Atlas Checkout. Search stays free; economics are earned when accommodation converts.</p><a href="/for-hotels">See the hotel model →</a></div></div>
        <div className="marketModelGrid"><article><span>FALLBACK</span><b>Referral</b><p>External fulfillment. Useful for coverage; exposed to leakage.</p></article><article><span>CORE</span><b>Managed merchant</b><p>Atlas-controlled checkout when contract, inventory and payment gates are active.</p></article><article><span>MOAT</span><b>Exclusive allocation</b><p>Private or exclusive long-stay inventory with observed unit economics—not hypothetical take rate.</p></article></div>
      </div></section>

      <StayReadiness duration={duration}/>

      <section className="moatBand"><div className="shell"><div className="sectionTitle"><div className="eyebrow">WHAT COMPOUNDS</div><h2>The interface can be copied.<br/>The operating graph cannot.</h2><p>Atlas is designed to accumulate proprietary operational evidence rather than defend a search box.</p></div><div className="loopGrid"><article><span>01</span><h3>Supply graph</h3><p>Which hotels allocate 30–90 day inventory, at what net rate, in which seasons and with what conversion.</p></article><article><span>02</span><h3>Demand graph</h3><p>Dates, budgets, amenities, sourcing requests and conversion outcomes by destination and stay length.</p></article><article><span>03</span><h3>Compliance engine</h3><p>Deterministic presence-day calculations and source-backed stay-readiness rules—not LLM legal improvisation.</p></article><article><span>04</span><h3>Owned distribution</h3><p>Field notes, evidence-led destination pages and shareable tools designed to reduce dependency on paid travel keywords.</p><a href="/geographic-arbitrage">Read Field Notes →</a></article></div></div></section>

      <section id="agent" className="agentBand"><div className="shell">
        <div className="sectionTitle"><h2>Need help narrowing it down?<br/>Ask Atlas.</h2><p>The concierge is an interface, not the moat. It turns intent into search filters while hotel facts and prices remain evidence-gated.</p></div>
        <div className="agentGrid">
          <div className="chat"><div className="chatlog">{chat.map((m,i)=><div className={"msg "+m.role} key={i}>{m.text}</div>)}</div><div className="chatrow"><input aria-label="Ask Atlas" value={draft} onChange={e=>setDraft(e.target.value)} onKeyDown={e=>e.key==="Enter"&&askAgent()} placeholder="e.g. Tenerife, walkable, sea, under €1,800/month…"/><button className="btn lime" onClick={askAgent}>{thinking?"…":"Ask"}</button></div></div>
          <div className="truth consumerTrustMetrics"><div className="metric"><b>Identity ≠ supply</b><span>a mapped hotel is not counted as commercial inventory</span></div><div className="metric"><b>Current</b><span>prices require fresh evidence</span></div><div className="metric"><b>Private request</b><span>unpriced demand enters the sourcing queue</span></div><div className="metric"><b>Clear</b><span>expired evidence disappears</span></div></div>
        </div>
      </div></section>

      <AdjacencyRail/>
      <SilverPromise/>
    </main>
    <footer className="footer"><div className="shell footerGrid"><span>ATLAS · LONG-STAY LIVING</span><span>30–90 day hotel stays. Verified rates or private sourcing.</span><span><a href="/about">About</a> · <a href="/for-hotels">For hotels</a> · <a href="/stay-readiness">Stay readiness</a> · <a href="/trust">Trust</a> · <a href="/legal">Legal</a></span></div></footer>
  </>;
}
