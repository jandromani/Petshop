"use client";
import { useEffect,useState } from "react";
import { growthEvent } from "@/src/growth/client";
import { SAVED_HOTELS_KEY,mergeSavedHotels,parseSavedHotels,type SavedHotel } from "@/src/core/saved-hotels";

export default function SaveHotelButton({hotel}:{hotel:{id:string;name:string;city:string;country:string;source:string}}){
  const[saved,setSaved]=useState(false);
  useEffect(()=>{
    let alive=true;
    const local=parseSavedHotels(localStorage.getItem(SAVED_HOTELS_KEY));
    const localSaved=local.some(x=>x.hotelId===hotel.id);setSaved(localSaved);
    void fetch("/api/saved/hotels",{cache:"no-store"}).then(async res=>{
      if(!res.ok)return;
      const data=await res.json().catch(()=>null);const server=parseSavedHotels(JSON.stringify(data?.saved||[]));
      const merged=mergeSavedHotels(local,server);localStorage.setItem(SAVED_HOTELS_KEY,JSON.stringify(merged));
      if(alive)setSaved(merged.some(x=>x.hotelId===hotel.id));
      if(localSaved&&!server.some(x=>x.hotelId===hotel.id)){
        const row=local.find(x=>x.hotelId===hotel.id);if(row)void fetch("/api/saved/hotels",{method:"PUT",headers:{"content-type":"application/json"},body:JSON.stringify(row),cache:"no-store"}).catch(()=>{});
      }
    }).catch(()=>{});
    return()=>{alive=false};
  },[hotel.id,hotel.name,hotel.city,hotel.country,hotel.source]);

  function toggle(){
    const rows=parseSavedHotels(localStorage.getItem(SAVED_HOTELS_KEY));const exists=rows.some(x=>x.hotelId===hotel.id);
    const row:SavedHotel={hotelId:hotel.id,name:hotel.name,city:hotel.city,country:hotel.country,source:hotel.source,savedAt:new Date().toISOString()};
    const next=exists?rows.filter(x=>x.hotelId!==hotel.id):[row,...rows].slice(0,60);
    localStorage.setItem(SAVED_HOTELS_KEY,JSON.stringify(next));setSaved(!exists);
    growthEvent(exists?"hotel_unsaved":"hotel_saved",{hotel_id:hotel.id,state:"property",source:hotel.source});
    window.dispatchEvent(new Event("atlas:saved-hotels"));
    if(exists)void fetch("/api/saved/hotels?hotelId="+encodeURIComponent(hotel.id),{method:"DELETE",cache:"no-store"}).catch(()=>{});
    else void fetch("/api/saved/hotels",{method:"PUT",headers:{"content-type":"application/json"},body:JSON.stringify(row),cache:"no-store"}).catch(()=>{});
  }

  return <button type="button" className={"saveStay "+(saved?"saved":"")} aria-pressed={saved} onClick={toggle}>{saved?"♥ Saved":"♡ Save"}</button>;
}
