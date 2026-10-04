"use client";
import { useEffect,useMemo,useState } from "react";
import { SAVED_STAYS_KEY,mergeSavedStays,parseSavedStays,type SavedStay } from "@/src/core/saved-stays";
import type { LiveCatalogOffer } from "@/src/core/live-offers";

type Row={saved:SavedStay;live:LiveCatalogOffer|null;checked:boolean};

const money=(n:number,c:string)=>new Intl.NumberFormat("en-US",{style:"currency",currency:c,maximumFractionDigits:0}).format(n);

async function durablePut(stay:SavedStay){
  return fetch("/api/saved",{method:"PUT",headers:{"content-type":"application/json"},body:JSON.stringify(stay),cache:"no-store"});
}

export default function SavedStaysClient(){
  const [rows,setRows]=useState<Row[]>([]);

  useEffect(()=>{
    let alive=true;

    async function load(){
      const local=parseSavedStays(localStorage.getItem(SAVED_STAYS_KEY));
      let saved=local;
      try{
        const res=await fetch("/api/saved",{cache:"no-store"});
        if(res.ok){
          const data=await res.json();
          const server=parseSavedStays(JSON.stringify(data?.saved||[]));
          saved=mergeSavedStays(local,server);
          localStorage.setItem(SAVED_STAYS_KEY,JSON.stringify(saved));
          const serverIds=new Set(server.map(x=>x.offerId));
          void Promise.all(local.filter(x=>!serverIds.has(x.offerId)).map(x=>durablePut(x).catch(()=>null)));
        }
      }catch{}

      if(!alive)return;
      setRows(saved.map(x=>({saved:x,live:null,checked:false})));
      const next=await Promise.all(saved.map(async item=>{
        try{
          const res=await fetch("/api/catalog/live?slug="+encodeURIComponent(item.slug)+"&limit=20",{cache:"no-store"});
          const data=res.ok?await res.json():null;
          const offers=Array.isArray(data?.offers)?data.offers as LiveCatalogOffer[]:[];
          return{saved:item,live:offers.find(o=>o.offerId===item.offerId)||null,checked:true};
        }catch{return{saved:item,live:null,checked:true};}
      }));
      if(alive)setRows(next);
    }

    void load();
    return()=>{alive=false;};
  },[]);

  const liveRows=useMemo(()=>rows.filter(x=>x.live),[rows]);

  function remove(id:string){
    const next=rows.filter(x=>x.saved.offerId!==id);
    setRows(next);
    localStorage.setItem(SAVED_STAYS_KEY,JSON.stringify(next.map(x=>x.saved)));
    void fetch("/api/saved?offerId="+encodeURIComponent(id),{method:"DELETE",cache:"no-store"}).catch(()=>{});
  }

  function clearAll(){
    setRows([]);
    localStorage.removeItem(SAVED_STAYS_KEY);
    void fetch("/api/saved?all=1",{method:"DELETE",cache:"no-store"}).catch(()=>{});
  }

  if(!rows.length)return <div className="card"><b>No saved stays yet.</b><p>Save verified offers from the live catalogue and compare them here. With a production database, Atlas also keeps the list in anonymous server-side memory.</p><a className="btn" href="/#explore">Find stays →</a></div>;

  return <>
    <div className="savedCompare">
      <div><b>{rows.length}</b><span>saved references</span></div>
      <div><b>{liveRows.length}</b><span>still live now</span></div>
      <div><b>{rows.length-liveRows.length}</b><span>need re-check</span></div>
    </div>
    <div className="actions" style={{marginBottom:18}}>
      <button className="btn ghost" onClick={clearAll}>Clear all saved memory</button>
    </div>
    <div className="savedGrid">
      {rows.map(({saved,live,checked})=><article className="card savedStayCard" key={saved.offerId}>
        <div className="hotelTopline"><span>{saved.provider}</span><span>{checked?(live?"LIVE NOW":"RE-CHECK REQUIRED"):"CHECKING…"}</span></div>
        <h2>{saved.name}</h2>
        <p>{saved.city}, {saved.country}</p>
        <div className="money">{live?money(live.monthlyEquivalent,live.currency):money(saved.savedMonthly,saved.currency)}<small>/month {live?"current verified":"saved reference only"}</small></div>
        <div className="budgetBreakdown">
          <div><span>Saved</span><b>{new Date(saved.savedAt).toLocaleDateString()}</b></div>
          <div><span>Offer evidence</span><b>{new Date(saved.verifiedAt).toLocaleString()}</b></div>
          {live&&<div><span>Current stay</span><b>{live.nights} nights · {live.occupancy} adult{live.occupancy===1?"":"s"}</b></div>}
          {live?.board&&<div><span>Board</span><b>{live.board}</b></div>}
          {live?.cancellation&&<div><span>Cancellation</span><b>{live.cancellation}</b></div>}
        </div>
        <div className="actions">
          {live?<a className="btn lime" href={"/api/referral?offer="+encodeURIComponent(live.offerId)+"&from=%2Fsaved"}>Open verified offer →</a>:<a className="btn ghost" href={"/live/"+saved.slug}>Re-check stay →</a>}
          <button className="btn ghost" onClick={()=>remove(saved.offerId)}>Remove</button>
        </div>
      </article>)}
    </div>
  </>;
}
