"use client";
import { useEffect,useState } from "react";
import type { RateAlert } from "@/src/core/rate-alerts";
import { growthEvent } from "@/src/growth/client";

export default function RateAlertsClient(){
  const[alerts,setAlerts]=useState<RateAlert[]>([]);
  useEffect(()=>{void fetch("/api/alerts/rates",{cache:"no-store"}).then(async r=>{if(r.ok){const j=await r.json();setAlerts(j.alerts||[])}}).catch(()=>{})},[]);
  function remove(id:string){setAlerts(v=>v.filter(x=>x.id!==id));void fetch("/api/alerts/rates?id="+encodeURIComponent(id),{method:"DELETE",cache:"no-store"}).catch(()=>{});growthEvent("rate_alert_removed",{alert_id:id})}
  if(!alerts.length)return null;
  return <section className="savedHotelsSection"><div className="sectionTitle"><h2>Rate alerts.</h2><p>Atlas only triggers these from fresh SELLABLE commercial evidence.</p></div><div className="savedGrid">{alerts.map(a=><article className="card savedStayCard" key={a.id}><div className="hotelTopline"><span>{a.status}</span><span>{a.nights} DAYS · {a.occupancy} GUEST{a.occupancy===1?"":"S"}</span></div><h2>{a.hotelName}</h2><p>{a.city}, {a.country} · check-in {a.checkIn}</p><b>{a.targetMonthly?"Target ≤ €"+Math.round(a.targetMonthly).toLocaleString("en-US")+"/mo":"Any verified rate"}</b>{a.status==="TRIGGERED"&&<p className="sourceSuccess">Matched {a.triggeredMonthly?"€"+Math.round(a.triggeredMonthly).toLocaleString("en-US")+"/mo":""} · verified offer available.</p>}<small>{a.lastCheckedAt?"Last checked "+new Date(a.lastCheckedAt).toLocaleString():"Waiting for first check"}</small><div className="actions"><a className="btn lime" href={"/stays/"+encodeURIComponent(a.hotelId)+"?checkIn="+encodeURIComponent(a.checkIn)+"&duration="+a.nights+"&occupancy="+a.occupancy}>Open hotel →</a><button className="btn ghost" onClick={()=>remove(a.id)}>Remove alert</button></div></article>)}</div></section>;
}