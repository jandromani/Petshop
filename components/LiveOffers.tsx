"use client";

import { useEffect,useState } from "react";
import type { LiveCatalogOffer } from "@/src/core/live-offers";
import { growthEvent } from "@/src/growth/client";
import LiveOfferCard from "@/components/LiveOfferCard";

export default function LiveOffers(){
  const [offers,setOffers]=useState<LiveCatalogOffer[]>([]);
  const [loaded,setLoaded]=useState(false);

  useEffect(()=>{
    let alive=true;
    fetch("/api/catalog/live?limit=12",{cache:"no-store"})
      .then(r=>r.ok?r.json():null)
      .then(data=>{
        if(!alive)return;
        const rows=Array.isArray(data?.offers)?data.offers:[];
        setOffers(rows);setLoaded(true);
        if(rows.length)growthEvent("live_catalog_loaded",{count:rows.length});
      })
      .catch(()=>{if(alive)setLoaded(true)});
    return()=>{alive=false};
  },[]);

  if(!loaded||!offers.length)return null;

  return <section className="discovery liveDiscovery"><div className="shell">
    <div className="sectionTitle">
      <h2>Available now.</h2>
      <p>These long-stay prices are currently verified for real hotels. Availability can change, so Atlas checks again before you leave for a booking partner.</p>
    </div>
    <div className="hotels">
      {offers.map((o,index)=><LiveOfferCard key={o.offerId} offer={o} detailHref={"/live/"+encodeURIComponent(o.slug)} href={"/api/referral?offer="+encodeURIComponent(o.offerId)+"&from=%2Flive&pos="+(index+1)}/>)}
    </div>
  </div></section>;
}
