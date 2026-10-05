"use client";
import { useEffect,useMemo,useRef,useState } from "react";
import * as maplibregl from "maplibre-gl";
import type { GeoJSONSource,Map as MapLibreMap } from "maplibre-gl";
import { growthEvent } from "@/src/growth/client";

export type MappedHotel={id:string;name:string;city:string;country:string;lat:number|null;lng:number|null;commercialState:"RATE_PENDING"|"VERIFIED_RATE";liveOffer?:{monthlyEquivalent:number;currency:string}|null};

function geojson(hotels:MappedHotel[]){
  return{type:"FeatureCollection" as const,features:hotels.filter(h=>Number.isFinite(h.lat)&&Number.isFinite(h.lng)).map(h=>({
    type:"Feature" as const,
    geometry:{type:"Point" as const,coordinates:[Number(h.lng),Number(h.lat)]},
    properties:{id:h.id,name:h.name,city:h.city,country:h.country,verified:h.commercialState==="VERIFIED_RATE"?1:0,monthly:h.liveOffer?.monthlyEquivalent||0,currency:h.liveOffer?.currency||"EUR"},
  }))};
}

export default function HotelMap({hotels,selectedId,onSelect,onSearchArea}:{hotels:MappedHotel[];selectedId?:string|null;onSelect:(id:string)=>void;onSearchArea:(bbox:string)=>void}){
  const host=useRef<HTMLDivElement|null>(null);
  const mapRef=useRef<MapLibreMap|null>(null);
  const [pendingBounds,setPendingBounds]=useState<string|null>(null);
  const data=useMemo(()=>geojson(hotels),[hotels]);

  useEffect(()=>{
    if(!host.current||mapRef.current)return;
    const map=new maplibregl.Map({container:host.current,style:"https://tiles.openfreemap.org/styles/bright",center:[8,28],zoom:1.35,minZoom:1,maxZoom:17,attributionControl:false});
    mapRef.current=map;
    map.addControl(new maplibregl.NavigationControl({showCompass:false}),"top-right");
    map.addControl(new maplibregl.AttributionControl({compact:true,customAttribution:"Overture Maps · OpenFreeMap"}),"bottom-right");
    map.on("load",()=>{
      map.addSource("atlas-hotels",{type:"geojson",data,cluster:true,clusterMaxZoom:12,clusterRadius:48});
      map.addLayer({id:"hotel-clusters",type:"circle",source:"atlas-hotels",filter:["has","point_count"],paint:{"circle-color":"#0a1630","circle-radius":["step",["get","point_count"],18,25,24,100,31],"circle-stroke-width":3,"circle-stroke-color":"#ffffff"}});
      map.addLayer({id:"hotel-cluster-count",type:"symbol",source:"atlas-hotels",filter:["has","point_count"],layout:{"text-field":["get","point_count_abbreviated"],"text-size":12},paint:{"text-color":"#ffffff"}});
      map.addLayer({id:"hotel-points",type:"circle",source:"atlas-hotels",filter:["!",["has","point_count"]],paint:{"circle-color":["case",["==",["get","verified"],1],"#2358e8","#ffffff"],"circle-radius":["case",["==",["get","verified"],1],9,7],"circle-stroke-width":3,"circle-stroke-color":"#0a1630"}});
      map.addLayer({id:"hotel-selected",type:"circle",source:"atlas-hotels",filter:["==",["get","id"],""],paint:{"circle-color":"#c8ff6a","circle-radius":13,"circle-stroke-width":4,"circle-stroke-color":"#0a1630"}});
    });
    map.on("click","hotel-clusters",async (e:any)=>{
      const feature=map.queryRenderedFeatures(e.point,{layers:["hotel-clusters"]})[0];const clusterId=Number(feature?.properties?.cluster_id);
      const source=map.getSource("atlas-hotels") as GeoJSONSource;const zoom=await source.getClusterExpansionZoom(clusterId);
      const coordinates=(feature?.geometry as any)?.coordinates;if(coordinates)map.easeTo({center:coordinates,zoom});
    });
    map.on("click","hotel-points",(e:any)=>{const f=map.queryRenderedFeatures(e.point,{layers:["hotel-points"]})[0];const id=String(f?.properties?.id||"");if(id){growthEvent("map_marker_click",{hotel_id:id});onSelect(id);}});
    for(const layer of ["hotel-clusters","hotel-points"]){map.on("mouseenter",layer,()=>{map.getCanvas().style.cursor="pointer"});map.on("mouseleave",layer,()=>{map.getCanvas().style.cursor=""});}
    map.on("moveend",()=>{const b=map.getBounds();setPendingBounds([b.getWest(),b.getSouth(),b.getEast(),b.getNorth()].map(v=>v.toFixed(5)).join(","));});
    return()=>{map.remove();mapRef.current=null;};
  },[]);

  useEffect(()=>{const map=mapRef.current;if(!map||!map.isStyleLoaded())return;const source=map.getSource("atlas-hotels") as GeoJSONSource|undefined;source?.setData(data as any);},[data]);
  useEffect(()=>{const map=mapRef.current;if(!map||!map.isStyleLoaded())return;map.setFilter("hotel-selected",["==",["get","id"],selectedId||""]);const h=hotels.find(x=>x.id===selectedId);if(h&&Number.isFinite(h.lat)&&Number.isFinite(h.lng))map.easeTo({center:[Number(h.lng),Number(h.lat)],zoom:Math.max(map.getZoom(),11),duration:500});},[selectedId,hotels]);

  return <div className="hotelMapShell">
    <div ref={host} className="hotelMap" aria-label="Interactive map of real hotels"/>
    <div className="mapTruth"><span><i className="mapKey pending"/> real property</span><span><i className="mapKey verified"/> verified rate</span></div>
    {pendingBounds&&<button className="searchArea" type="button" onClick={()=>{growthEvent("search_this_area");onSearchArea(pendingBounds)}}>Search this area</button>}
  </div>;
}