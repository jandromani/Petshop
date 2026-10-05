"use client";
import dynamic from "next/dynamic";
import { useEffect,useMemo,useRef,useState } from "react";
import type { SearchRegion,StayDuration } from "@/src/core/search";
import { growthEvent } from "@/src/growth/client";
import type { MappedHotel } from "@/components/HotelMap";

const HotelMap=dynamic(()=>import("@/components/HotelMap"),{ssr:false,loading:()=> <div className="hotelMapLoading">Loading interactive map…</div>});

type Offer={offerId:string;provider:string;monthlyEquivalent:number;displayPrice:number;currency:string;board:string|null;cancellation:string|null;verifiedAt:string;expiresAt:string|null;photoUrls:string[];facilities:string[]};
type Row=MappedHotel&{canonicalId:string;region:Exclude<SearchRegion,"All">;source:string;sourceId:string;referenceUrl:string;website:string|null;address:string|null;confidence:number|null;description:string|null;photoUrls:string[];facilities:string[];liveOffer:Offer|null;preferenceScore?:number;matchedPreferences?:string[]};
export type DirectoryPayload={total:number;mapped:number;hotels:Row[];snapshotDate:string;note:string;attribution?:string|null;source:string};
type MapPayload=Omit<DirectoryPayload,"hotels">&{hotels:MappedHotel[]};
const money=(n:number,c="EUR")=>new Intl.NumberFormat("en-US",{style:"currency",currency:c,maximumFractionDigits:0}).format(n);

export default function RealHotelDirectory({initialQuery="",initialRegion="All",duration=90,checkIn,occupancy=1,maxMonthly,flexibleDays=7,initialAmenities=[],onCount,onQueryChange,onRegionChange,initialData}:{
  initialQuery?:string;initialRegion?:SearchRegion;duration?:StayDuration;checkIn?:string;occupancy?:1|2;maxMonthly?:number;flexibleDays?:0|7|30;initialAmenities?:string[];
  onCount?:(count:number)=>void;onQueryChange?:(q:string)=>void;onRegionChange?:(r:SearchRegion)=>void;initialData?:DirectoryPayload;
}){
  const[q,setQ]=useState(initialQuery);const[region,setRegion]=useState<SearchRegion>(initialRegion);const[page,setPage]=useState(0);
  const[data,setData]=useState<DirectoryPayload|null>(initialData||null);const[mapData,setMapData]=useState<MapPayload|null>(null);const[loading,setLoading]=useState(!initialData);
  const[selectedId,setSelectedId]=useState<string|null>(null);const[bbox,setBbox]=useState<string|null>(null);const[mobileView,setMobileView]=useState<"list"|"map">("list");const[features,setFeatures]=useState<string[]>(initialAmenities);const[mapVisible,setMapVisible]=useState(false);const mapPaneRef=useRef<HTMLElement|null>(null);
  const pageSize=24;const seen=useRef(new Set<string>());
  useEffect(()=>{setQ(initialQuery);setPage(0);setBbox(null)},[initialQuery]);useEffect(()=>{setRegion(initialRegion);setPage(0);setBbox(null)},[initialRegion]);useEffect(()=>{setFeatures(initialAmenities)},[initialAmenities]);
  const baseParams=useMemo(()=>{const p=new URLSearchParams({region,duration:String(duration),occupancy:String(occupancy),flexibleDays:String(flexibleDays)});if(q.trim())p.set("q",q.trim());if(checkIn)p.set("checkIn",checkIn);if(maxMonthly)p.set("maxMonthly",String(Math.round(maxMonthly)));if(bbox)p.set("bbox",bbox);if(features.length)p.set("features",features.join(","));return p},[q,region,duration,occupancy,checkIn,maxMonthly,flexibleDays,bbox,features]);
  const listParams=useMemo(()=>{const p=new URLSearchParams(baseParams);p.set("limit",String(pageSize));p.set("offset",String(page*pageSize));return p},[baseParams,page]);
  const mapParams=useMemo(()=>{const p=new URLSearchParams(baseParams);p.set("view","map");return p},[baseParams]);

  useEffect(()=>{
    const c=new AbortController();setLoading(true);const t=setTimeout(()=>fetch("/api/hotels/directory?"+listParams,{signal:c.signal}).then(r=>r.ok?r.json():Promise.reject()).then((payload:DirectoryPayload)=>{
      setData(payload);onCount?.(payload.total);growthEvent("results_loaded",{count:payload.total,mapped:payload.mapped,query:q||"all",region,page});
    }).catch(()=>{}).finally(()=>setLoading(false)),120);return()=>{clearTimeout(t);c.abort()};
  },[listParams,onCount,q,region,page]);
  const mapEnabled=mapVisible||mobileView==="map";
  useEffect(()=>{const el=mapPaneRef.current;if(!el)return;const io=new IntersectionObserver(entries=>{if(entries.some(e=>e.isIntersecting)){setMapVisible(true);io.disconnect()}},{rootMargin:"700px"});io.observe(el);return()=>io.disconnect()},[]);
  useEffect(()=>{if(!mapEnabled)return;const c=new AbortController();fetch("/api/hotels/directory?"+mapParams,{signal:c.signal}).then(r=>r.ok?r.json():Promise.reject()).then((payload:MapPayload)=>setMapData(payload)).catch(()=>{});return()=>c.abort()},[mapParams,mapEnabled]);

  function changeQuery(value:string){setQ(value);setPage(0);setBbox(null);onQueryChange?.(value)}
  function changeRegion(value:SearchRegion){setRegion(value);setPage(0);setBbox(null);onRegionChange?.(value);growthEvent("filter_change",{filter:"region",value})}
  function chooseFromMap(id:string){setSelectedId(id);setMobileView("list");requestAnimationFrame(()=>document.getElementById("hotel-card-"+id)?.scrollIntoView({behavior:"smooth",block:"center"}))}
  function searchArea(next:string){setBbox(next);setPage(0)}
  function toggleFeature(value:string){setFeatures(v=>{const next=v.includes(value)?v.filter(x=>x!==value):[...v,value];growthEvent("filter_change",{filter:"preference",value,active:!v.includes(value)});setPage(0);return next})}
  const hotels=data?.hotels||[],mapped=mapData?.hotels||[];
  useEffect(()=>{const io=new IntersectionObserver(entries=>{for(const e of entries){if(!e.isIntersecting)continue;const el=e.target as HTMLElement;const id=el.dataset.hotelId;if(!id||seen.current.has(id))continue;seen.current.add(id);growthEvent("hotel_impression",{hotel_id:id,position:Number(el.dataset.position)||0,state:el.dataset.state||"pending"});io.unobserve(el);}}, {threshold:.35});for(const el of document.querySelectorAll<HTMLElement>("[data-hotel-id]"))io.observe(el);return()=>io.disconnect();},[hotels,page]);

  return <section id="explore" className="discovery realDirectory"><div className="shell">
    <div className="resultsHeadline"><div><div className="eyebrow">REAL HOTEL SEARCH</div><h2>{loading?"Finding real hotels…":(data?.total||0)+" real hotels"}</h2><p>Identity comes from real-world place data. Dates, duration, guests and budget are applied to verified commercial offers; hotels without a verified rate stay visible as <b>rate pending</b>, never as fake bargains.</p></div><div className="resultStats"><b>{data?.mapped||mapData?.mapped||0}</b><span>mapped properties</span></div></div>
    <div className="toolbar directoryToolbar"><input aria-label="Search real hotels" value={q} onChange={e=>changeQuery(e.target.value)} placeholder="Hotel, city, country or address…"/><select aria-label="Filter real hotels by region" value={region} onChange={e=>changeRegion(e.target.value as SearchRegion)}><option>All</option><option>Europe</option><option>Asia</option><option>Africa</option><option>Americas</option></select>{bbox&&<button className="btn ghost" onClick={()=>setBbox(null)}>Clear map area</button>}<div className="directoryCount">{loading?"Loading…":(data?.total||0)+" matches"}</div></div>
    <div className="preferenceFilters"><span>Known-property preferences</span>{["pool","gym","spa","beach","breakfast","all inclusive"].map(x=><button key={x} className={features.includes(x)?"active":""} onClick={()=>toggleFeature(x)}>{x}</button>)}<small>Known matches rank first; unknown amenities remain visible.</small></div>
    <div className="mobileResultToggle"><button className={mobileView==="list"?"active":""} onClick={()=>setMobileView("list")}>List</button><button className={mobileView==="map"?"active":""} onClick={()=>setMobileView("map")}>Map · {data?.mapped||mapData?.mapped||0}</button></div>
    <div className={"hotelExplorer view-"+mobileView}>
      <div className="hotelListPane">
        <div className="hotels realHotelGrid">{hotels.map((h,index)=>{const offer=h.liveOffer;const photo=offer?.photoUrls?.[0]||h.photoUrls?.[0];const facilities=(offer?.facilities?.length?offer.facilities:h.facilities).slice(0,4);return <article id={"hotel-card-"+h.id} className={"hotel realHotelCard "+(selectedId===h.id?"selected":"")} key={h.id} data-hotel-id={h.id} data-position={page*pageSize+index+1} data-state={offer?"verified":"pending"} onMouseEnter={()=>setSelectedId(h.id)}>
          <div className={"hotelVisual realHotelMedia region-"+h.region.toLowerCase()}>{photo?<img src={photo} alt={h.name} loading="lazy" referrerPolicy="no-referrer"/>:<div className="placeFallback"><span>{h.city}</span><small>{h.country}</small></div>}<span className={"score "+(offer?"verifiedBadge":"")}>{offer?"VERIFIED RATE":"REAL HOTEL"}</span></div>
          <div className="hotelBody"><div className="hotelTopline"><span>{h.source==="overture"?"OVERTURE IDENTITY":h.source==="curated_seed"?"CURATED IDENTITY":h.source.toUpperCase()}</span><span>{offer?"LIVE":"RATE PENDING"}</span></div><h3>{h.name}</h3><div className="loc">{h.address||h.city+", "+h.country}</div>
          <div className="chips">{facilities.length?facilities.map(x=><span className="chip" key={x}>{x}</span>):<><span className="chip">{duration}-day intent</span><span className="chip">{occupancy} guest{occupancy===1?"":"s"}</span></>}{(h.matchedPreferences||[]).map(x=><span className="chip matchedPref" key={"m-"+x}>✓ {x}</span>)}</div>
          <div className="priceRow directoryActions"><div>{offer?<><b>{money(offer.monthlyEquivalent,offer.currency)}</b><small>/30-day equivalent · verified {new Date(offer.verifiedAt).toLocaleDateString()}</small></>:<><b>Rate pending</b><small>Ask Atlas Supply to source your dates</small></>}</div><div className="directoryLinks"><a className="linkbtn" onClick={()=>growthEvent("hotel_card_click",{hotel_id:h.id,position:page*pageSize+index+1,state:offer?"verified":"pending"})} href={"/stays/"+encodeURIComponent(h.id)+"?"+new URLSearchParams({duration:String(duration),...(checkIn?{checkIn}:{}),occupancy:String(occupancy)}).toString()}>{offer?"View verified stay →":"Find my rate →"}</a>{h.website&&<a className="eyebrow" href={h.website} target="_blank" rel="noreferrer" onClick={()=>growthEvent("hotel_official_site_click",{hotel_id:h.id,position:page*pageSize+index+1})}>Official site ↗</a>}</div></div></div>
        </article>})}</div>
        {!loading&&data&&<div className="directoryPager"><button className="btn ghost" disabled={page===0} onClick={()=>setPage(p=>Math.max(0,p-1))}>← Previous</button><span>{data.total?Math.min(page*pageSize+1,data.total):0}–{Math.min((page+1)*pageSize,data.total)} of {data.total}</span><button className="btn ghost" disabled={(page+1)*pageSize>=data.total} onClick={()=>setPage(p=>p+1)}>Next →</button></div>}
      </div>
      <aside ref={mapPaneRef} className="hotelMapPane">{mapEnabled?<HotelMap hotels={mapped} selectedId={selectedId} onSelect={chooseFromMap} onSearchArea={searchArea}/>:<div className="hotelMapLoading">Interactive map loads when you reach the results.</div>}</aside>
    </div>
    <p className="directoryDisclosure">Property identity is not a booking claim. A price is shown only after Atlas has a fresh truth-gated commercial offer.{data?.attribution?" Data: "+data.attribution+".":""}</p>
  </div></section>;
}