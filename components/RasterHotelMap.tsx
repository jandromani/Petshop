"use client";
import { useCopy } from "@/components/useCopy";

import { useEffect,useMemo,useRef } from "react";
import * as L from "leaflet";
import "leaflet/dist/leaflet.css";
import type { MappedHotel } from "@/components/HotelMap";
import { growthEvent } from "@/src/growth/client";

type Props={
  hotels:MappedHotel[];
  selectedId?:string|null;
  onSelect:(id:string)=>void;
  onBoundsChange:(bounds:string)=>void;
  onReady:(ready:boolean)=>void;
  fitKey:string;
  expanded:boolean;
};

export default function RasterHotelMap({hotels,selectedId,onSelect,onBoundsChange,onReady,fitKey,expanded}:Props){
  const {t,local,language}=useCopy();
  const host=useRef<HTMLDivElement|null>(null);
  const mapRef=useRef<L.Map|null>(null);
  const pointsRef=useRef<L.LayerGroup|null>(null);
  const fittedKey=useRef<string|null>(null);
  const callbacks=useRef({onSelect,onBoundsChange,onReady});
  callbacks.current={onSelect,onBoundsChange,onReady};
  const mapped=useMemo(()=>hotels.filter(h=>Number.isFinite(h.lat)&&Number.isFinite(h.lng)),[hotels]);
  // Canvas keeps the global directory bounded in DOM size. The selector also
  // gives keyboard users an explicit selection path without relying on pixels.
  const choices=useMemo(()=>{
    const rows=mapped.slice(0,60);
    const selected=mapped.find(h=>h.id===selectedId);
    return selected&&!rows.some(h=>h.id===selected.id)?[selected,...rows]:rows;
  },[mapped,selectedId]);

  useEffect(()=>{
    if(!host.current)return;
    const map=L.map(host.current,{preferCanvas:true,zoomControl:true,minZoom:1,maxZoom:19}).setView([28,8],2);
    mapRef.current=map;
    map.zoomControl.setPosition("topright");
    // Interactive viewport requests only: browser cache and Referer are kept.
    // A deployment can replace this best-effort OSM service without code edits.
    L.tileLayer(process.env.NEXT_PUBLIC_RASTER_TILE_URL||"https://tile.openstreetmap.org/{z}/{x}/{y}.png",{
      maxZoom:19,
      attribution:process.env.NEXT_PUBLIC_RASTER_TILE_ATTRIBUTION||'© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors · Overture Maps',
      updateWhenIdle:true,
      keepBuffer:1,
    }).addTo(map);
    pointsRef.current=L.layerGroup().addTo(map);
    map.on("moveend",()=>{
      const b=map.getBounds();
      callbacks.current.onBoundsChange([Math.max(-180,b.getWest()),Math.max(-90,b.getSouth()),Math.min(180,b.getEast()),Math.min(90,b.getNorth())].map(v=>v.toFixed(5)).join(","));
    });
    map.whenReady(()=>callbacks.current.onReady(true));
    return()=>{map.remove();mapRef.current=null;pointsRef.current=null};
  },[]);

  useEffect(()=>{
    const map=mapRef.current,points=pointsRef.current;
    if(!map||!points)return;
    points.clearLayers();
    for(const hotel of mapped){
      const selected=hotel.id===selectedId;
      const marker=L.circleMarker([Number(hotel.lat),Number(hotel.lng)],{
        radius:selected?12:hotel.liveOffer?9:7,
        color:"#0a1630",weight:selected?4:3,
        fillColor:selected?"#c8ff6a":hotel.liveOffer?"#2358e8":"#ffffff",fillOpacity:1,
      }).addTo(points);
      // Text nodes prevent hotel/source data from becoming executable HTML.
      const label=document.createElement("span");
      label.textContent=hotel.name+(hotel.liveOffer?" · "+new Intl.NumberFormat("en-US",{style:"currency",currency:hotel.liveOffer.currency,maximumFractionDigits:0}).format(hotel.liveOffer.monthlyEquivalent)+" / 30 days":"");
      marker.bindTooltip(label);
      marker.on("click",()=>{growthEvent("map_marker_click",{hotel_id:hotel.id});callbacks.current.onSelect(hotel.id)});
    }
    if(mapped.length&&fittedKey.current!==fitKey){
      map.fitBounds(L.latLngBounds(mapped.map(h=>[Number(h.lat),Number(h.lng)] as [number,number])),{padding:[50,50],maxZoom:11,animate:false});
      fittedKey.current=fitKey;
    }
  },[mapped,selectedId,fitKey]);

  useEffect(()=>{
    const hotel=mapped.find(h=>h.id===selectedId);
    if(hotel)mapRef.current?.panTo([Number(hotel.lat),Number(hotel.lng)],{animate:false});
  },[selectedId,mapped]);

  useEffect(()=>{
    const frame=requestAnimationFrame(()=>mapRef.current?.invalidateSize());
    return()=>cancelAnimationFrame(frame);
  },[expanded]);

  return <>
    <div ref={host} className="hotelMap hotelMapRaster" aria-label={t("Interactive map of real hotels")} data-mapped-hotels={mapped.length}/>
    {choices.length>0&&<label className="mapHotelPicker">
      <span>{t("Explore a hotel")}</span>
      <select aria-label={t("Select a hotel on the map")} value={selectedId||""} onChange={e=>{growthEvent("map_marker_click",{hotel_id:e.target.value});onSelect(e.target.value)}}>
        <option value="">{t("Choose a hotel…")}</option>
        {choices.map(h=><option key={h.id} value={h.id}>{h.name}</option>)}
      </select>
    </label>}
  </>;
}
