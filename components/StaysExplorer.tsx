"use client";
import { useCopy } from "@/components/useCopy";
import { useEffect,useState } from "react";
import SilverSearch from "@/components/SilverSearch";
import AiHotelSearch,{type AiSearchIntent} from "@/components/AiHotelSearch";
import RealHotelDirectory,{type DirectoryPayload} from "@/components/RealHotelDirectory";
import { growthEvent } from "@/src/growth/client";
import type { SearchRegion,StayDuration } from "@/src/core/search";
import type { Party } from "@/src/core/planner";

export type StaysInitialSearch={
  selected?:string;view?:"list"|"map";searchScope?:"auto"|"destination"|"hotel";query:string;region:SearchRegion;checkIn:string;flexibleDays:0|7|30;duration:StayDuration;
  occupancy:1|2;budget:number;features:string[];featuresMode:"rank"|"strict";verifiedOnly:boolean;
  minMonthly?:number;board:string;cancellation:string;provider:string;brand:string;brandedOnly:boolean;
  sort:"recommended"|"price"|"confidence"|"name";page:number;bbox:string;
};

const primaryDuration=(d:StayDuration):StayDuration=>d===30||d===60?d:90;

export default function StaysExplorer({initial,initialData}:{initial:StaysInitialSearch;initialData?:DirectoryPayload}){
  const {t,local,language}=useCopy();
  const[query,setQuery]=useState(initial.query);const[region,setRegion]=useState<SearchRegion>(initial.region);
  const[checkIn,setCheckIn]=useState(initial.checkIn);const[flexibleDays,setFlexibleDays]=useState<0|7|30>(initial.flexibleDays);
  const[duration,setDuration]=useState<StayDuration>(primaryDuration(initial.duration));const[party,setParty]=useState<Party>(initial.occupancy===2?"couple":"solo");
  const[budget,setBudget]=useState(initial.budget);const[amenities,setAmenities]=useState<string[]>(initial.features);const[count,setCount]=useState(initialData?.total||0);

  useEffect(()=>{const onPop=()=>window.location.reload();window.addEventListener("popstate",onPop);return()=>window.removeEventListener("popstate",onPop)},[]);

  function submit(){
    growthEvent("hero_search",{surface:"stays",query:query||"all",region,party,duration,budget,check_in:checkIn,flexible_days:flexibleDays,matches:count});
    document.getElementById("explore")?.scrollIntoView({behavior:"smooth"});
  }
  function applyAi(intent:AiSearchIntent){
    const d=primaryDuration(intent.duration);setQuery(intent.query);setRegion(intent.region);setDuration(d);setParty(intent.occupancy===2?"couple":"solo");
    setFlexibleDays(intent.flexibleDays);if(intent.maxMonthly)setBudget(intent.maxMonthly);setAmenities(intent.amenities);
    growthEvent("ai_search_navigation",{surface:"stays",query:intent.query||"all",region:intent.region,duration:d});
    setTimeout(()=>document.getElementById("explore")?.scrollIntoView({behavior:"smooth"}),50);
  }

  return <main className="seoPage staysSearchPage">
    <section className="staysSearchHero"><div className="shell">
      <a className="eyebrow" href={local("/")}>{t("← ATLAS LONG STAY")}</a>
      <div className="staysSearchIntro"><div><div className="eyebrow">{t("30–90 DAY HOTEL LIVING")}</div><h1>{t("Find one place")}<br/>{t("for a month or a season.")}</h1><p>{t("Explore real hotels, compare current prices when available and request a rate for your dates.")}</p></div><div className="staysSearchMetric"><b>30 / 60 / 90</b><span>{t("days per stay")}</span></div></div>
      <SilverSearch query={query} setQuery={setQuery} region={region} setRegion={setRegion} checkIn={checkIn} setCheckIn={setCheckIn} flexibleDays={flexibleDays} setFlexibleDays={setFlexibleDays} duration={duration} setDuration={setDuration} party={party} setParty={setParty} budget={budget} setBudget={setBudget} count={count} onSearch={submit}/>
      <AiHotelSearch current={{region,duration,occupancy:party==="couple"?2:1,maxMonthly:budget}} onApply={applyAi}/>
    </div></section>
    <RealHotelDirectory
      initialSelected={initial.selected} initialView={initial.view} initialQuery={query} initialSearchScope={initial.searchScope} initialRegion={region} duration={duration} checkIn={checkIn} occupancy={party==="couple"?2:1}
      maxMonthly={budget} flexibleDays={flexibleDays} initialAmenities={amenities}
      initialFeaturesMode={initial.featuresMode} initialVerifiedOnly={initial.verifiedOnly} initialMinMonthly={initial.minMonthly}
      initialBoard={initial.board} initialCancellation={initial.cancellation} initialProvider={initial.provider}
      initialBrand={initial.brand} initialBrandedOnly={initial.brandedOnly} initialSort={initial.sort}
      initialPage={initial.page} initialBbox={initial.bbox} initialData={initialData}
      onCount={setCount} onQueryChange={setQuery} onRegionChange={setRegion}
    />
  </main>;
}
