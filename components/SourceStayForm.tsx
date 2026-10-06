"use client";
import { useState,type FormEvent } from "react";
import { useLanguage } from "@/components/LanguageProvider";
import { copy,localizedHref } from "@/src/i18n/config";
import type { StayDuration } from "@/src/core/search";
import { growthEvent } from "@/src/growth/client";

type Result={notification?:"automatic"|"ops-queue";status?:string;id?:string;trackingPath?:string};

export default function SourceStayForm({hotelId,defaultCheckIn,defaultDuration,defaultOccupancy=1,defaultBudget}:{hotelId:string;defaultCheckIn:string;defaultDuration:StayDuration;defaultOccupancy?:1|2;defaultBudget?:number}){
  const lang=useLanguage();const t=(en:string,es:string)=>copy(lang,en,es);
  const initial=defaultDuration;
  const[checkIn,setCheckIn]=useState(defaultCheckIn);const[nights,setNights]=useState<StayDuration>(initial);const[occupancy,setOccupancy]=useState<1|2>(defaultOccupancy);
  const[budget,setBudget]=useState(defaultBudget?String(defaultBudget):"");const[email,setEmail]=useState("");const[consent,setConsent]=useState(false);
  const[state,setState]=useState<"idle"|"sending"|"done"|"error">("idle");const[result,setResult]=useState<Result|null>(null);

  async function submit(event:FormEvent<HTMLFormElement>){
    event.preventDefault();
    if(!email||!consent)return;
    setState("sending");growthEvent("source_rate_start",{hotel_id:hotelId,nights,occupancy,target_monthly:budget?Number(budget):0});
    const res=await fetch("/api/sourcing",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({hotelId,checkIn,nights,occupancy,targetMonthlyEur:budget?Number(budget):undefined,requesterEmail:email,contactConsent:consent,language:lang,sourcePath:location.pathname.slice(0,300)})}).catch(()=>null);
    const data=await res?.json().catch(()=>null);
    const ok=Boolean(res?.ok);setResult(data||null);setState(ok?"done":"error");growthEvent(ok?"source_rate_success":"source_rate_error",{hotel_id:hotelId,nights,occupancy,notification:data?.notification||"unknown"});
  }

  return <form className="sourceStay" onSubmit={submit}>
    <div className="eyebrow">{t("YOUR STAY REQUEST","TU SOLICITUD DE ESTANCIA")}</div><h3>{t("Get a rate for your dates.","Solicita una tarifa para tus fechas.")}</h3>
    <p>{t("Tell us where to send your quote. This request is free and makes no reservation or payment.","Indica dónde quieres recibir el presupuesto. La solicitud es gratuita y no crea una reserva ni realiza un cobro.")}</p>
    <div className="sourceStayGrid">
      <label><span>{t("Check-in","Entrada")}</span><input type="date" required value={checkIn} onChange={e=>setCheckIn(e.target.value)}/></label>
      <label><span>{t("Stay","Estancia")}</span><select aria-label={t("Stay","Estancia")} value={nights} onChange={e=>setNights(Number(e.target.value) as StayDuration)}>{[30,60,90,120,180,365].map(v=><option value={v} key={v}>{v} {t("nights","noches")}</option>)}</select></label>
      <label><span>{t("Guests","Huéspedes")}</span><select aria-label={t("Guests","Huéspedes")} value={occupancy} onChange={e=>setOccupancy(Number(e.target.value) as 1|2)}><option value={1}>1</option><option value={2}>2</option></select></label>
      <label><span>{t("Budget €/30 nights","Presupuesto €/30 noches")}</span><input type="number" min={1} max={50000} step="0.01" value={budget} onChange={e=>setBudget(e.target.value)} placeholder={t("optional","opcional")}/></label>
      <label className="sourceEmail"><span>{t("Email for the quote","Email para el presupuesto")}</span><input type="email" required maxLength={254} autoComplete="email" value={email} onChange={e=>setEmail(e.target.value)} placeholder="you@example.com"/></label>
    </div>
    <label className="sourceConsent"><input type="checkbox" required checked={consent} onChange={e=>setConsent(e.target.checked)}/><span>{t("Use my email for this request and its quote or status updates.","Utiliza mi email para esta solicitud, su presupuesto y sus actualizaciones.")} <a href={localizedHref("/privacy",lang)}>{t("Privacy policy","Política de privacidad")}</a>.</span></label>
    <button className="btn lime" disabled={state==="sending"||state==="done"||!email||!consent}>{state==="sending"?t("Sending…","Enviando…"):state==="done"?t("Request received ✓","Solicitud recibida ✓"):t("Request my stay rate →","Solicitar tarifa para mi estancia →")}</button>
    {state==="done"&&<div className="sourceSuccess" role="status"><b>{t("We have your dates.","Hemos recibido tus fechas.")}</b><p>{t("Follow your request here. We will show a quote when a matching rate is verified.","Sigue tu solicitud aquí. Mostraremos el presupuesto cuando comprobemos una tarifa para tus fechas.")}</p>{result?.notification==="ops-queue"&&<p>{t("Email updates are pending activation. Check your request in this browser.","Las actualizaciones por email están pendientes de activación. Consulta tu solicitud en este navegador.")}</p>}<a className="btn" href={localizedHref("/requests",lang)}>{t("Follow my request →","Seguir mi solicitud →")}</a><small>{t("Request","Solicitud")} {result?.id?.slice(0,8)}</small></div>}
    {state==="error"&&<p className="sourceError" role="alert">{t("Could not send your request. Check the details and try again.","No hemos podido enviar la solicitud. Revisa los datos e inténtalo de nuevo.")}</p>}
  </form>;
}
