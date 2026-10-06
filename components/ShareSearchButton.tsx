"use client";
import { useState } from "react";
import { useLanguage } from "@/components/LanguageProvider";
import { localizedHref,copy } from "@/src/i18n/config";
import { searchShareTitle,publicSearchQuery } from "@/src/core/shared-search";
import { growthEvent } from "@/src/growth/client";
export default function ShareSearchButton({query,hotelIds=[]}:{query:string;hotelIds?:string[]}){
  const lang=useLanguage();const[busy,setBusy]=useState(false);const[message,setMessage]=useState("");
  async function share(){
    if(busy)return;setBusy(true);setMessage("");
    query=publicSearchQuery(query);
    let url=window.location.origin+localizedHref(hotelIds.length?"/compare":"/stays",lang)+"?"+query+(hotelIds.length?"&ids="+hotelIds.join(","):"");
    try{const response=await fetch("/api/share-search",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({query,hotelIds,language:lang})});if(response.ok){const data=await response.json();url=data.url}}
    catch{}
    try{
      const title=searchShareTitle(query,lang);
      if(navigator.share&&(!navigator.canShare||navigator.canShare({url,title})))await navigator.share({url,title});
      else {await navigator.clipboard.writeText(url);setMessage(copy(lang,"Link copied","Enlace copiado"))}
      growthEvent("route_shared",{surface:hotelIds.length?"comparison":"hotel_search",hotels:hotelIds.length});
    }catch(error){if(!(error instanceof DOMException&&error.name==="AbortError")){window.prompt(copy(lang,"Copy this public link","Copia este enlace público"),url)}}
    finally{setBusy(false)}
  }
  return <div className="shareControl"><button className="btn ghost" type="button" disabled={busy} onClick={share}>{busy?copy(lang,"Preparing…","Preparando…"):copy(lang,"Share search","Compartir búsqueda")}</button><small role="status">{message||copy(lang,"Anyone with the link can view this selection.","Quien tenga el enlace podrá ver esta selección.")}</small></div>;
}
