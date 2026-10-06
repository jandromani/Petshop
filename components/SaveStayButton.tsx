"use client";
import { useCopy } from "@/components/useCopy";
import { useEffect,useState } from "react";
import type { LiveCatalogOffer } from "@/src/core/live-offers";
import { growthEvent } from "@/src/growth/client";
import { SAVED_STAYS_KEY,mergeSavedStays,parseSavedStays,toggleSavedStay,type SavedStay } from "@/src/core/saved-stays";

function stayFromOffer(offer:LiveCatalogOffer):SavedStay{
  return{
    offerId:offer.offerId,slug:offer.slug,name:offer.name,city:offer.city,country:offer.country,provider:offer.provider,
    savedMonthly:offer.monthlyEquivalent,currency:offer.currency,verifiedAt:offer.verifiedAt,expiresAt:offer.expiresAt,savedAt:new Date().toISOString(),
  };
}

async function saveDurably(stay:SavedStay){
  await fetch("/api/saved",{method:"PUT",headers:{"content-type":"application/json"},body:JSON.stringify(stay),cache:"no-store"});
}

export default function SaveStayButton({offer}:{offer:LiveCatalogOffer}){
  const {t,local,language}=useCopy();
  const [saved,setSaved]=useState(false);

  useEffect(()=>{
    let alive=true;
    const local=parseSavedStays(localStorage.getItem(SAVED_STAYS_KEY));
    const locallySaved=local.some(x=>x.offerId===offer.offerId);
    setSaved(locallySaved);

    void fetch("/api/saved",{cache:"no-store"}).then(async res=>{
      if(!res.ok)return;
      const data=await res.json().catch(()=>null);
      const server=parseSavedStays(JSON.stringify(data?.saved||[]));
      const merged=mergeSavedStays(local,server);
      localStorage.setItem(SAVED_STAYS_KEY,JSON.stringify(merged));
      if(alive)setSaved(merged.some(x=>x.offerId===offer.offerId));
      if(locallySaved&&!server.some(x=>x.offerId===offer.offerId)){
        await saveDurably(local.find(x=>x.offerId===offer.offerId)||stayFromOffer(offer)).catch(()=>{});
      }
    }).catch(()=>{});

    return()=>{alive=false;};
  },[offer]);

  function toggle(){
    try{
      const rows=parseSavedStays(localStorage.getItem(SAVED_STAYS_KEY));
      const exists=rows.some(x=>x.offerId===offer.offerId);
      const stay=stayFromOffer(offer);
      const next=toggleSavedStay(rows,stay);
      localStorage.setItem(SAVED_STAYS_KEY,JSON.stringify(next));
      setSaved(!exists);
      growthEvent(exists?"hotel_unsaved":"hotel_saved",{hotel_id:offer.hotelId,offer_id:offer.offerId,provider:offer.provider,monthly:offer.monthlyEquivalent});
      window.dispatchEvent(new Event("atlas:saved-stays"));
      if(exists){
        void fetch("/api/saved?offerId="+encodeURIComponent(offer.offerId),{method:"DELETE",cache:"no-store"}).catch(()=>{});
      }else{
        void saveDurably(stay).catch(()=>{});
      }
    }catch{}
  }

  return <button type="button" className={"saveStay "+(saved?"saved":"")} aria-pressed={saved} onClick={toggle}>{saved?t("♥ Saved"):t("♡ Save")}</button>;
}
