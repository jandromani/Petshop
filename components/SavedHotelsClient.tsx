"use client";
import { useCopy } from "@/components/useCopy";
import { useEffect,useState } from "react";
import { SAVED_HOTELS_KEY,mergeSavedHotels,parseSavedHotels,type SavedHotel } from "@/src/core/saved-hotels";
import { growthEvent } from "@/src/growth/client";

export default function SavedHotelsClient(){
  const {t,local,language}=useCopy();
  const[selection,setSelection]=useState<string[]>([]);
  const[rows,setRows]=useState<SavedHotel[]>([]);
  useEffect(()=>{
    let alive=true;
    const local=parseSavedHotels(localStorage.getItem(SAVED_HOTELS_KEY));setRows(local);
    void fetch("/api/saved/hotels",{cache:"no-store"}).then(async res=>{
      if(!res.ok)return;
      const data=await res.json().catch(()=>null);const server=parseSavedHotels(JSON.stringify(data?.saved||[]));
      const merged=mergeSavedHotels(local,server);localStorage.setItem(SAVED_HOTELS_KEY,JSON.stringify(merged));if(alive)setRows(merged);
    }).catch(()=>{});
    return()=>{alive=false};
  },[]);
  function remove(id:string){
    setSelection(current=>current.filter(value=>value!==id));
    const next=rows.filter(x=>x.hotelId!==id);setRows(next);localStorage.setItem(SAVED_HOTELS_KEY,JSON.stringify(next));
    growthEvent("hotel_unsaved",{hotel_id:id,state:"property",surface:"saved"});
    void fetch("/api/saved/hotels?hotelId="+encodeURIComponent(id),{method:"DELETE",cache:"no-store"}).catch(()=>{});
  }
  if(!rows.length)return null;
  return <section className="savedHotelsSection"><div className="sectionTitle"><h2>{t("Saved hotels.")}</h2><p>{t("Keep interesting places here even before a long-stay price is available.")}</p></div><div className="actions">{selection.length>0&&<a className="btn" href={local("/compare")+"?ids="+selection.join(",")}>{t("Compare hotels →")} ({selection.length}/3)</a>}</div><div className="savedGrid">
    {rows.map(h=><article className="card savedStayCard" key={h.hotelId}><div className="hotelTopline"><span>{h.city}</span><span>{t("SAVED")}</span></div><h2>{h.name}</h2><p>{h.city}, {h.country}</p><small>{t("Saved")} {new Date(h.savedAt).toLocaleDateString()}</small><div className="actions"><a className="btn lime" href={local("/stays/"+encodeURIComponent(h.hotelId))} onClick={()=>growthEvent("saved_hotel_open",{hotel_id:h.hotelId})}>{t("Open hotel →")}</a><button className="btn ghost" aria-pressed={selection.includes(h.hotelId)} disabled={!selection.includes(h.hotelId)&&selection.length>=3} onClick={()=>setSelection(v=>v.includes(h.hotelId)?v.filter(id=>id!==h.hotelId):[...v,h.hotelId])}>{t("Compare")}</button><button className="btn ghost" onClick={()=>remove(h.hotelId)}>{t("Remove")}</button></div></article>)}
  </div></section>;
}
