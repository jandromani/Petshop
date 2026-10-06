"use client";
import { useCopy } from "@/components/useCopy";

import { useEffect,useMemo,useState } from "react";
import type { LiveCatalogOffer } from "@/src/core/live-offers";
import type { StaySearch } from "@/src/core/search";

const money=(n:number,currency:string)=>new Intl.NumberFormat("en-US",{style:"currency",currency,maximumFractionDigits:0}).format(n);

export default function VerifiedRoute({search}:{search:StaySearch}){
  const {t,local,language}=useCopy();
  const [offers,setOffers]=useState<LiveCatalogOffer[]>([]);
  const [loading,setLoading]=useState(true);
  const [error,setError]=useState(false);

  useEffect(()=>{
    const controller=new AbortController();setLoading(true);setError(false);
    const timer=setTimeout(()=>{
      const params=new URLSearchParams({
        limit:"20",maxMonthly:String(Math.max(1,Math.round(search.maxMonthly))),checkIn:search.checkIn,
        flexibleDays:String(search.flexibleDays),nights:String(search.duration),
        occupancy:String(search.party==="couple"?2:1),region:search.region,
      });
      if(search.query.trim())params.set("q",search.query.trim());
      fetch("/api/catalog/live?"+params.toString(),{cache:"no-store",signal:controller.signal})
        .then(async r=>{if(!r.ok)throw new Error("catalog "+r.status);return r.json()})
        .then(data=>{setOffers(Array.isArray(data?.offers)?data.offers:[]);setLoading(false)})
        .catch(e=>{if(e?.name!=="AbortError"){setError(true);setLoading(false)}});
    },250);
    return()=>{clearTimeout(timer);controller.abort()};
  },[search.query,search.region,search.checkIn,search.flexibleDays,search.duration,search.party,search.maxMonthly]);

  const route=useMemo(()=>offers.slice(0,Math.min(6,offers.length)),[offers]);
  if(loading)return <div className="card routeAvailability"><b>{t("Checking current prices…")}</b><p>{t("Looking for verified long-stay rates that fit your dates and budget.")}</p></div>;
  if(error)return null;
  if(!route.length)return <div className="card routeAvailability">
    <div className="eyebrow">{t("NO VERIFIED PRICE YET")}</div>
    <h3>{t("No current long-stay rate matches this exact plan.")}</h3>
    <p>Keep building the route as inspiration, then request a price for the hotels you would actually choose.</p>
  </div>;

  const avg=Math.round(route.reduce((s,o)=>s+o.monthlyEquivalent,0)/route.length);
  return <div className="card routeAvailability">
    <div className="moneyline">
      <div><div className="label"><span>{t("VERIFIED SUPPLY FOR THIS SEARCH")}</span></div><div className="money">{money(avg,route[0].currency)}<small>{t("/month average")}</small></div></div>
      <div className="surplus"><span>{t("matching stays")}</span><b>{offers.length}</b></div>
    </div>
    <div className="route">
      {route.map((o,i)=><div className="stop" key={o.offerId}>
        <div className="when">{t("OPTION")} {String(i+1).padStart(2,"0")}</div>
        <div><b>{o.city}, {o.country}</b><small>{o.nights} {t("nights ·")} {o.occupancy} {t("guest")}{o.occupancy===1?"":"s"}{o.board?" · "+o.board:""}</small></div>
        <div className="cost"><a href={o.checkoutMode==="atlas_checkout"?"/checkout/"+encodeURIComponent(o.offerId)+"?checkIn="+encodeURIComponent(o.checkIn)+"&nights="+o.nights+"&occupancy="+o.occupancy:"/api/referral?offer="+encodeURIComponent(o.offerId)+"&from=%2Fplanner"}>{money(o.monthlyEquivalent,o.currency)}{t("/mo")} {o.checkoutMode==="atlas_checkout"?"· Atlas Checkout":"→"}</a></div>
      </div>)}
    </div>
  </div>;
}
