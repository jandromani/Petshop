"use client";
import { useEffect,useState } from "react";
import type { LiveCatalogOffer } from "@/src/core/live-offers";
import { SAVED_STAYS_KEY,parseSavedStays,toggleSavedStay,type SavedStay } from "@/src/core/saved-stays";

export default function SaveStayButton({offer}:{offer:LiveCatalogOffer}){
  const [saved,setSaved]=useState(false);
  useEffect(()=>{
    try{setSaved(parseSavedStays(localStorage.getItem(SAVED_STAYS_KEY)).some(x=>x.offerId===offer.offerId));}catch{}
  },[offer.offerId]);

  function toggle(){
    try{
      const rows=parseSavedStays(localStorage.getItem(SAVED_STAYS_KEY));
      const stay:SavedStay={
        offerId:offer.offerId,slug:offer.slug,name:offer.name,city:offer.city,country:offer.country,provider:offer.provider,
        savedMonthly:offer.monthlyEquivalent,currency:offer.currency,verifiedAt:offer.verifiedAt,expiresAt:offer.expiresAt,savedAt:new Date().toISOString(),
      };
      const next=toggleSavedStay(rows,stay);
      localStorage.setItem(SAVED_STAYS_KEY,JSON.stringify(next));
      setSaved(next.some(x=>x.offerId===offer.offerId));
      window.dispatchEvent(new Event("atlas:saved-stays"));
    }catch{}
  }

  return <button type="button" className={"saveStay "+(saved?"saved":"")} aria-pressed={saved} onClick={toggle}>{saved?"♥ Saved":"♡ Save"}</button>;
}
