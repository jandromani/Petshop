"use client";
import dynamic from "next/dynamic";
import { useEffect,useMemo,useRef,useState } from "react";
import type { SearchRegion,StayDuration } from "@/src/core/search";
import { growthEvent } from "@/src/growth/client";
import type { MappedHotel } from "@/components/HotelMap";
import SaveHotelButton from "@/components/SaveHotelButton";

const HotelMap=dynamic(()=>import("@/components/HotelMap"),{ssr:false,loading:()=> <div className="hotelMapShell hotelMapLoadingShell" data-map-ready="loading"><div className="hotelMapLoading">Loading interactive map…</div></div>});

type Offer={
  offerId:string;provider:string;monthlyEquivalent:number;displayPrice:number;currency:string;
  board:string|null;cancellation:string|null;verifiedAt:string;expiresAt:string|null;photoUrls:string[];facilities:string[];checkoutMode?:"redirect"|"atlas_checkout";channelModel?:"REFERRAL"|"MERCHANT"|"EXCLUSIVE_MERCHANT";
};
type Relaxation={action:string;label:string};
type Facets={verified:number;branded:number;officialWebsite:number;mapped:number};
type Row=MappedHotel&{
  canonicalId:string;region:Exclude<SearchRegion,"All">;source:string;sourceId:string;referenceUrl:string;
  website:string|null;address:string|null;confidence:number|null;description:string|null;photoUrls:string[];facilities:string[];
  liveOffer:Offer|null;preferenceScore?:number;matchedPreferences?:string[];unconfirmedPreferences?:string[];why?:string[];
  brand?:string|null;category?:string|null;taxonomy?:string[];contentProvider?:string|null;contentLicenseRef?:string|null;contentSourceUrl?:string|null;contentFetchedAt?:string|null;
};
export type DirectoryPayload={
  search?:{scope:"destination"|"hotel";query:string};total:number;mapped:number;hotels:Row[];snapshotDate:string;note:string;attribution?:string|null;source:string;
  facets?:Facets;relaxations?:Relaxation[];
};
type MapPayload=Omit<DirectoryPayload,"hotels">&{hotels:MappedHotel[]};
const money=(n:number,c="EUR")=>new Intl.NumberFormat("en-US",{style:"currency",currency:c,maximumFractionDigits:0}).format(n);

export default function RealHotelDirectory({
  initialQuery="",initialSearchScope="auto",initialRegion="All",duration=90,checkIn,occupancy=1,maxMonthly,flexibleDays=7,
  initialAmenities=[],initialFeaturesMode="rank",initialVerifiedOnly=false,initialMinMonthly,initialBoard="",initialCancellation="",initialProvider="",initialBrand="",initialBrandedOnly=false,initialSort="recommended",initialPage=0,initialBbox="",onCount,onQueryChange,onRegionChange,initialData,
}:{
  initialSearchScope?:"auto"|"destination"|"hotel";initialQuery?:string;initialRegion?:SearchRegion;duration?:StayDuration;checkIn?:string;occupancy?:1|2;maxMonthly?:number;
  flexibleDays?:0|7|30;initialAmenities?:string[];initialFeaturesMode?:"rank"|"strict";initialVerifiedOnly?:boolean;initialMinMonthly?:number;initialBoard?:string;initialCancellation?:string;initialProvider?:string;initialBrand?:string;initialBrandedOnly?:boolean;initialSort?:"recommended"|"price"|"confidence"|"name";initialPage?:number;initialBbox?:string;onCount?:(count:number)=>void;onQueryChange?:(q:string)=>void;
  onRegionChange?:(r:SearchRegion)=>void;initialData?:DirectoryPayload;
}){
  const[searchScope,setSearchScope]=useState(initialSearchScope);
  const[q,setQ]=useState(initialQuery);const[region,setRegion]=useState<SearchRegion>(initialRegion);const[page,setPage]=useState(Math.max(0,initialPage));
  const[data,setData]=useState<DirectoryPayload|null>(initialData||null);const[mapData,setMapData]=useState<MapPayload|null>(null);const[loading,setLoading]=useState(!initialData);
  const[selectedId,setSelectedId]=useState<string|null>(null);const[bbox,setBbox]=useState<string|null>(initialBbox||null);const[mobileView,setMobileView]=useState<"list"|"map">("list");
  const[features,setFeatures]=useState<string[]>(initialAmenities);const[featuresMode,setFeaturesMode]=useState<"rank"|"strict">(initialFeaturesMode);
  const[verifiedOnly,setVerifiedOnly]=useState(initialVerifiedOnly);const[minMonthly,setMinMonthly]=useState<number|undefined>(initialMinMonthly);
  const[board,setBoard]=useState(initialBoard);const[cancellation,setCancellation]=useState(initialCancellation);const[provider,setProvider]=useState(initialProvider);
  const[brand,setBrand]=useState(initialBrand);const[brandedOnly,setBrandedOnly]=useState(initialBrandedOnly);const[sort,setSort]=useState<"recommended"|"price"|"confidence"|"name">(initialSort);
  const[mapVisible,setMapVisible]=useState(false);const[shareLabel,setShareLabel]=useState("Share search");
  const mapPaneRef=useRef<HTMLElement|null>(null);const seen=useRef(new Set<string>());const zeroSeen=useRef(new Set<string>());const urlMode=useRef<"replace"|"push">("replace");
  const initialSnapshot=useRef({query:initialQuery,searchScope:initialSearchScope,region:initialRegion,duration,occupancy,maxMonthly,flexibleDays,features:[...initialAmenities],featuresMode:initialFeaturesMode,verifiedOnly:initialVerifiedOnly,minMonthly:initialMinMonthly,board:initialBoard,cancellation:initialCancellation,provider:initialProvider,brand:initialBrand,brandedOnly:initialBrandedOnly,sort:initialSort,page:Math.max(0,initialPage),bbox:initialBbox||""});
  const pageSize=24;

  useEffect(()=>{setQ(initialQuery);setPage(0);setBbox(null)},[initialQuery]);
  useEffect(()=>{setRegion(initialRegion);setPage(0);setBbox(null)},[initialRegion]);
  useEffect(()=>{setFeatures(initialAmenities)},[initialAmenities]);

  const baseParams=useMemo(()=>{
    const p=new URLSearchParams({region,duration:String(duration),occupancy:String(occupancy),flexibleDays:String(flexibleDays),sort});
    if(searchScope!=="auto")p.set("searchScope",searchScope);
    if(q.trim())p.set("q",q.trim());if(checkIn)p.set("checkIn",checkIn);if(maxMonthly)p.set("maxMonthly",String(Math.round(maxMonthly)));
    if(minMonthly)p.set("minMonthly",String(Math.round(minMonthly)));if(bbox)p.set("bbox",bbox);if(features.length)p.set("features",features.join(","));
    if(featuresMode!=="rank")p.set("featuresMode",featuresMode);if(verifiedOnly)p.set("verifiedOnly","1");if(board)p.set("board",board);
    if(cancellation)p.set("cancellation",cancellation);if(provider)p.set("provider",provider);if(brand.trim())p.set("brand",brand.trim());
    if(brandedOnly)p.set("brandedOnly","1");
    return p;
  },[q,searchScope,region,duration,occupancy,flexibleDays,sort,checkIn,maxMonthly,minMonthly,bbox,features,featuresMode,verifiedOnly,board,cancellation,provider,brand,brandedOnly]);

  const listParams=useMemo(()=>{const p=new URLSearchParams(baseParams);p.set("limit",String(pageSize));p.set("offset",String(page*pageSize));return p},[baseParams,page]);
  const mapParams=useMemo(()=>{const p=new URLSearchParams(baseParams);p.set("view","map");return p},[baseParams]);

  useEffect(()=>{
    const initial=initialSnapshot.current;
    const sameAsServerSnapshot=Boolean(initialData)
      && q===initial.query&&searchScope===initial.searchScope&&region===initial.region&&duration===initial.duration&&occupancy===initial.occupancy
      && maxMonthly===initial.maxMonthly&&flexibleDays===initial.flexibleDays
      && features.join("|")===initial.features.join("|")&&featuresMode===initial.featuresMode
      && verifiedOnly===initial.verifiedOnly&&minMonthly===initial.minMonthly
      && board===initial.board&&cancellation===initial.cancellation&&provider===initial.provider
      && brand===initial.brand&&brandedOnly===initial.brandedOnly&&sort===initial.sort
      && page===initial.page&&(bbox||"")===initial.bbox;
    if(sameAsServerSnapshot){
      setLoading(false);onCount?.(initialData!.total);return;
    }
    const c=new AbortController();setLoading(true);
    const timer=setTimeout(()=>fetch("/api/hotels/directory?"+listParams,{signal:c.signal})
      .then(r=>r.ok?r.json():Promise.reject()).then((payload:DirectoryPayload)=>{
        setData(payload);onCount?.(payload.total);
        growthEvent("results_loaded",{count:payload.total,mapped:payload.mapped,query:q||"all",region,page,verified_only:verifiedOnly});
        if(payload.total===0){
          const signature=listParams.toString();if(!zeroSeen.current.has(signature)){zeroSeen.current.add(signature);growthEvent("search_zero_results",{query:q||"all",region,verified_only:verifiedOnly});}
        }
      }).catch(()=>{}).finally(()=>setLoading(false)),120);
    return()=>{clearTimeout(timer);c.abort()};
  },[listParams,onCount,q,searchScope,region,page,verifiedOnly,initialData,duration,occupancy,maxMonthly,flexibleDays,features,featuresMode,minMonthly,board,cancellation,provider,brand,brandedOnly,sort,bbox]);

  const mapEnabled=mapVisible||mobileView==="map";
  useEffect(()=>{const el=mapPaneRef.current;if(!el)return;const io=new IntersectionObserver(entries=>{if(entries.some(e=>e.isIntersecting)){setMapVisible(true);io.disconnect()}},{rootMargin:"700px"});io.observe(el);return()=>io.disconnect()},[]);
  useEffect(()=>{if(!mapEnabled)return;const c=new AbortController();fetch("/api/hotels/directory?"+mapParams,{signal:c.signal}).then(r=>r.ok?r.json():Promise.reject()).then((payload:MapPayload)=>setMapData(payload)).catch(()=>{});return()=>c.abort()},[mapParams,mapEnabled]);

  useEffect(()=>{
    if(typeof window==="undefined"||window.location.pathname!=="/stays")return;
    const p=new URLSearchParams(baseParams);if(page)p.set("page",String(page));
    const next="/stays"+(p.size?"?"+p.toString():"");
    if(urlMode.current==="push")window.history.pushState(null,"",next);else window.history.replaceState(null,"",next);
    urlMode.current="replace";
  },[baseParams,page]);

  function changeQuery(value:string){setQ(value);setPage(0);setBbox(null);onQueryChange?.(value)}
  function changeRegion(value:SearchRegion){urlMode.current="push";setRegion(value);setPage(0);setBbox(null);onRegionChange?.(value);growthEvent("filter_change",{filter:"region",value})}
  function chooseFromMap(id:string){setSelectedId(id||null);if(!id)return;if(mobileView==="list")requestAnimationFrame(()=>document.getElementById("hotel-card-"+id)?.scrollIntoView({behavior:"smooth",block:"center"}))}
  function searchArea(next:string){urlMode.current="push";setBbox(next);setPage(0)}
  function toggleFeature(value:string){urlMode.current="push";setFeatures(v=>{const next=v.includes(value)?v.filter(x=>x!==value):[...v,value];growthEvent("filter_change",{filter:"preference",value,active:!v.includes(value)});setPage(0);return next})}
  function setFilter(name:string,value:string|boolean|number){urlMode.current="push";growthEvent("filter_change",{filter:name,value});setPage(0)}
  function relax(action:string){urlMode.current="push";
    if(action==="clear_bbox")setBbox(null);
    if(action==="show_rate_pending")setVerifiedOnly(false);
    if(action==="rank_features")setFeaturesMode("rank");
    if(action==="clear_brand")setBrand("");
    if(action==="all_regions")changeRegion("All");
    if(action==="clear_query")changeQuery("");
  }
  async function shareSearch(){
    const p=new URLSearchParams(baseParams);if(page)p.set("page",String(page));
    const url=window.location.origin+"/stays"+(p.size?"?"+p.toString():"");
    try{await navigator.clipboard.writeText(url);setShareLabel("Copied ✓");growthEvent("route_shared",{surface:"hotel_search",filters:p.toString().length});setTimeout(()=>setShareLabel("Share search"),1600)}
    catch{window.prompt("Copy this Atlas search",url)}
  }

  const hotels=data?.hotels||[],mapped=mapData?.hotels||[];
  useEffect(()=>{const io=new IntersectionObserver(entries=>{for(const e of entries){if(!e.isIntersecting)continue;const el=e.target as HTMLElement;const id=el.dataset.hotelId;if(!id||seen.current.has(id))continue;seen.current.add(id);growthEvent("hotel_impression",{hotel_id:id,position:Number(el.dataset.position)||0,state:el.dataset.state||"pending"});io.unobserve(el);}}, {threshold:.35});for(const el of document.querySelectorAll<HTMLElement>("[data-hotel-id]"))io.observe(el);return()=>io.disconnect();},[hotels,page]);

  const detailQuery=new URLSearchParams({duration:String(duration),...(checkIn?{checkIn}:{}),occupancy:String(occupancy)}).toString();
  const mapFitKey=[q,searchScope,region,duration,occupancy,features.join("|"),featuresMode,verifiedOnly,board,cancellation,provider,brand,brandedOnly,sort].join("~");

  return <section id="explore" className="discovery realDirectory"><div className="shell">
    <div className="resultsHeadline consumerResultsHeadline"><div><div className="eyebrow">LONG-STAY RESULTS</div><h2>{loading?"Finding stays…":(data?.facets?.verified||0)>0?"Available now":"Choose a hotel. Request a private long-stay rate."}</h2><p>{(data?.facets?.verified||0)>0?"Verified long-stay prices are shown first.":"No verified long-stay prices match yet. Every result below is a real hotel identity in the searchable universe; it becomes commercial supply only when a rate is verified."}</p></div><div className="availabilitySummary"><div><b>{data?.facets?.verified||0}</b><span>verified rates</span></div><div><b>{data?.total||0}</b><span>searchable hotels</span></div></div></div>

    <div className="toolbar directoryToolbar consumerDirectoryToolbar">
      <input aria-label="Refine hotel results" value={q} onChange={e=>changeQuery(e.target.value)} placeholder="Refine by hotel, city or brand…"/>
      <select aria-label="Search by" value={searchScope} onChange={e=>{setSearchScope(e.target.value as typeof searchScope);setBbox(null);setFilter("search_scope",e.target.value)}}><option value="auto">Detect destination</option><option value="destination">Destination only</option><option value="hotel">Hotel name / brand</option></select>
      <select aria-label="Sort hotel results" value={sort} onChange={e=>{const v=e.target.value as typeof sort;setSort(v);setFilter("sort",v)}}><option value="recommended">Recommended</option><option value="price">Monthly price</option><option value="name">Name A–Z</option></select>
      {bbox&&<button className="btn ghost" onClick={()=>{setBbox(null);setFilter("bbox","cleared")}}>Clear map area</button>}
      <button className="btn ghost" onClick={shareSearch}>{shareLabel}</button>
      <div className="directoryCount">{loading?"Loading…":(data?.total||0)+" stays"}</div>
    </div>

    {q&&data?.search&&<p className="searchScopeHint" role="status">{data.search.scope==="destination"?"Searching in destination: ":"Searching hotel names and brands: "}{data.search.query}</p>}
    <div className="preferenceFilters"><span>Amenities</span>{["pool","gym","spa","beach","breakfast","all inclusive","kitchen"].map(x=><button key={x} className={features.includes(x)?"active":""} onClick={()=>toggleFeature(x)}>{x}</button>)}<button className={featuresMode==="strict"?"active":""} onClick={()=>{const v=featuresMode==="rank"?"strict":"rank";setFeaturesMode(v);setFilter("features_mode",v)}}>{featuresMode==="strict"?"Verified info only ✓":"Verified info only"}</button></div>

    <details className="advancedHotelFilters">
      <summary>More filters <span>price · board · cancellation · brand</span></summary>
      <div className="advancedHotelGrid">
        <label><span>Availability</span><select value={verifiedOnly?"verified":"all"} onChange={e=>{const v=e.target.value==="verified";setVerifiedOnly(v);setFilter("verified_only",v)}}><option value="all">Any hotel</option><option value="verified">Available now</option></select></label>
        <label><span>Min verified €/month</span><input inputMode="numeric" placeholder="Any" value={minMonthly||""} onChange={e=>{const v=Number(e.target.value.replace(/[^0-9]/g,""))||undefined;setMinMonthly(v);setFilter("min_monthly",v||0)}}/></label>
        <label><span>Board</span><select value={board} onChange={e=>{setBoard(e.target.value);setFilter("board",e.target.value||"any")}}><option value="">Any / unknown</option><option value="breakfast">Breakfast</option><option value="half">Half board</option><option value="full">Full board</option><option value="all inclusive">All inclusive</option></select></label>
        <label><span>Cancellation</span><select value={cancellation} onChange={e=>{setCancellation(e.target.value);setFilter("cancellation",e.target.value||"any")}}><option value="">Any / unknown</option><option value="free">Free cancellation</option><option value="refundable">Refundable</option><option value="non-refundable">Non-refundable</option></select></label>
        <label><span>Provider</span><select value={provider} onChange={e=>{setProvider(e.target.value);setFilter("provider",e.target.value||"any")}}><option value="">Any verified provider</option><option value="direct">Direct hotel</option><option value="booking">Booking</option><option value="ratehawk">RateHawk</option><option value="hbx">HBX</option></select></label>
        <label><span>Brand</span><input placeholder="Hilton, Marriott…" value={brand} onChange={e=>{setBrand(e.target.value);setFilter("brand",e.target.value||"any")}}/></label>
        <label className="checkFilter"><input type="checkbox" checked={brandedOnly} onChange={e=>{setBrandedOnly(e.target.checked);setFilter("branded_only",e.target.checked)}}/><span>Known brand only</span></label>
      </div>
    </details>

    <div className="mobileResultToggle"><button className={mobileView==="list"?"active":""} onClick={()=>setMobileView("list")}>List</button><button className={mobileView==="map"?"active":""} onClick={()=>setMobileView("map")}>Map · {data?.mapped||mapData?.mapped||0}</button></div>

    <div className={"hotelExplorer view-"+mobileView}>
      <div className="hotelListPane">
        {loading&&!hotels.length?<div className="hotels realHotelGrid">{Array.from({length:6},(_,i)=><div className="hotel hotelSkeleton" key={i}><div/><span/><span/><span/></div>)}</div>:null}
        {data?.total===0?<div className="zeroResults card"><div className="eyebrow">NO MATCHES YET</div><h3>Nothing fits every filter.</h3><p>Try relaxing one option and we’ll widen the search without inventing availability.</p><div className="actions">{((data.relaxations&&data.relaxations.length)?data.relaxations:[...(q?[{action:"clear_query",label:"Clear destination/name"}]:[]),...(region!=="All"?[{action:"all_regions",label:"Search all regions"}]:[]),...(brand?[{action:"clear_brand",label:"Any brand"}]:[]),...(verifiedOnly?[{action:"show_rate_pending",label:"Include rate-pending hotels"}]:[]),...(featuresMode==="strict"&&features.length?[{action:"rank_features",label:"Rank facilities instead of requiring them"}]:[])]).map(r=><button className="btn ghost" key={r.action} onClick={()=>relax(r.action)}>{r.label}</button>)}</div></div>:null}
        <div className="hotels realHotelGrid">{hotels.map((h,index)=>{const offer=h.liveOffer;const photo=offer?.photoUrls?.[0]||h.photoUrls?.[0];const facilities=(offer?.facilities?.length?offer.facilities:h.facilities).slice(0,4);return <article id={"hotel-card-"+h.id} className={"hotel realHotelCard "+(selectedId===h.id?"selected":"")} key={h.id} data-hotel-id={h.id} data-position={page*pageSize+index+1} data-state={offer?"verified":"pending"} onMouseEnter={()=>setSelectedId(h.id)}>
          <div className={"hotelVisual realHotelMedia region-"+h.region.toLowerCase()}>{photo?<><img src={photo} alt={h.name} loading="lazy" referrerPolicy="no-referrer"/>{h.contentProvider&&<span className="contentProvenance">Photo licensed · {h.contentProvider}</span>}</>:<div className="placeFallback travelFallback"><span>{h.city}</span><small>{h.country}</small><em>Long-stay escape</em></div>}<span className={"score "+(offer?"verifiedBadge":"")}>{offer?"AVAILABLE NOW":"REAL HOTEL"}</span></div>
          <div className="hotelBody"><div className="hotelTopline"><span>{h.brand||h.city}</span><span>{offer?"AVAILABLE":"PRIVATE RATE"}</span></div><h3>{h.name}</h3><div className="loc">{h.address||h.city+", "+h.country}</div>
          <div className="chips">{facilities.length?facilities.map(x=><span className="chip" key={x}>{x}</span>):<><span className="chip">{duration}-day intent</span><span className="chip">{occupancy} guest{occupancy===1?"":"s"}</span></>}{(h.matchedPreferences||[]).map(x=><span className="chip matchedPref" key={"m-"+x}>✓ {x}</span>)}</div>
          {features.length&&h.unconfirmedPreferences?.length?<small className="evidenceUnknown">We haven’t verified: {h.unconfirmedPreferences.join(", ")}</small>:null}
          <div className="priceRow directoryActions"><div>{offer?<><b>{money(offer.monthlyEquivalent,offer.currency)}</b><small>/month equivalent · verified for a current offer</small></>:<><b>Private long-stay rate on request</b><small>{duration}-day stay · {occupancy} guest{occupancy===1?"":"s"}</small></>}</div><div className="directoryLinks"><a className="linkbtn" onClick={()=>growthEvent("hotel_card_click",{hotel_id:h.id,position:page*pageSize+index+1,state:offer?"verified":"pending"})} href={"/stays/"+encodeURIComponent(h.id)+"?"+detailQuery}>{offer?"View stay →":"Request private rate →"}</a>{h.website&&offer?.checkoutMode!=="atlas_checkout"&&<a className="secondaryLink" href={h.website} target="_blank" rel="noreferrer" onClick={()=>growthEvent("hotel_official_site_click",{hotel_id:h.id,position:page*pageSize+index+1})}>Official site ↗</a>}<SaveHotelButton hotel={{id:h.id,name:h.name,city:h.city,country:h.country,source:h.source}}/></div></div></div>
        </article>})}</div>
        {!loading&&data&&data.total>0?<div className="directoryPager"><button className="btn ghost" disabled={page===0} onClick={()=>{urlMode.current="push";setPage(p=>Math.max(0,p-1))}}>← Previous</button><span>{Math.min(page*pageSize+1,data.total)}–{Math.min((page+1)*pageSize,data.total)} of {data.total}</span><button className="btn ghost" disabled={(page+1)*pageSize>=data.total} onClick={()=>{urlMode.current="push";setPage(p=>p+1)}}>Next →</button></div>:null}
      </div>
      <aside ref={mapPaneRef} className="hotelMapPane">{mapEnabled?<HotelMap hotels={mapped} selectedId={selectedId} onSelect={chooseFromMap} onSearchArea={searchArea} detailQuery={detailQuery} fitKey={mapFitKey}/>:<div className="hotelMapLoading">Interactive map loads when you reach the results.</div>}</aside>
    </div>
    <p className="directoryDisclosure">Atlas only shows a price when it can verify it for your dates. A searchable hotel is discovery coverage, not contracted supply. No verified price yet? Create a private-rate sourcing case.</p>
  </div></section>;
}
