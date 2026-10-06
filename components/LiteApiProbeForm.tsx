"use client";
import { useState,type FormEvent } from "react";

export default function LiteApiProbeForm({configured}:{configured:boolean}) {
  const [busy,setBusy]=useState(false);const [result,setResult]=useState<Record<string,unknown>|null>(null);
  async function submit(event:FormEvent<HTMLFormElement>) {
    event.preventDefault();setBusy(true);const form=new FormData(event.currentTarget);const values=Object.fromEntries(form.entries());
    const res=await fetch("/api/providers/liteapi/probe",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({...values,nights:Number(values.nights),adults:Number(values.adults)})}).catch(()=>null);
    setResult(await res?.json().catch(()=>null)||{error:"Connection unavailable"});setBusy(false);
  }
  return <section className="partnerOpsCard"><h2>LiteAPI whole-stay availability</h2><p>{configured?"Key configured. This search does not publish rates or create a booking.":"Add LITEAPI_API_KEY privately in Vercel to enable this check. Choose LITEAPI_ENVIRONMENT explicitly: sandbox or production."}</p>
    <form onSubmit={submit}><div className="partnerFormGrid">
      <label>City<input name="city" defaultValue="Madrid" required minLength={2}/></label><label>Country code<input name="countryCode" defaultValue="ES" required pattern="[A-Z]{2}" maxLength={2}/></label>
      <label>Guest nationality<input name="guestNationality" defaultValue="ES" required pattern="[A-Z]{2}" maxLength={2}/></label>
      <label>Check-in<input name="checkIn" type="date" required/></label><label>Nights<select name="nights">{[30,60,90].map(n=><option key={n}>{n}</option>)}</select></label>
      <label>Adults<select name="adults"><option>1</option><option>2</option></select></label><label>Currency<select name="currency"><option>EUR</option><option>USD</option><option>GBP</option></select></label>
    </div><button className="btn" disabled={!configured||busy}>{busy?"Checking suppliers…":"Check full stay"}</button></form>
    {result&&<pre className="partnerProbeResult" aria-label="LiteAPI probe result">{JSON.stringify(result,null,2)}</pre>}
  </section>;
}
