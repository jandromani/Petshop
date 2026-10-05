"use client";
import { useState } from "react";

export default function MerchantCheckoutForm({offerId,checkIn,nights,occupancy,enabled}:{offerId:string;checkIn:string;nights:30|60|90;occupancy:1|2;enabled:boolean}){
  const[email,setEmail]=useState("");const[accepted,setAccepted]=useState(false);const[state,setState]=useState<"idle"|"loading"|"error">("idle");const[error,setError]=useState("");
  async function checkout(){
    if(!enabled||!email||!accepted||state==="loading")return;setState("loading");setError("");
    const res=await fetch("/api/checkout",{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({offerId,checkIn,nights,occupancy,email})}).catch(()=>null);
    const data=await res?.json().catch(()=>null);if(!res?.ok||!data?.url){setState("error");setError(data?.error||"Checkout unavailable.");return;}
    window.location.assign(data.url);
  }
  return <div className="merchantCheckoutForm">
    <label><span>Email for booking</span><input type="email" autoComplete="email" value={email} onChange={e=>setEmail(e.target.value)} placeholder="you@example.com"/></label>
    <label className="sourceConsent"><input type="checkbox" checked={accepted} onChange={e=>setAccepted(e.target.checked)}/><span>I accept that Atlas will use this email and the booking details to process this accommodation transaction and related service messages.</span></label>
    <button className="btn lime" disabled={!enabled||!email||!accepted||state==="loading"} onClick={checkout}>{!enabled?"Atlas Checkout not activated":state==="loading"?"Opening secure checkout…":"Pay securely with Atlas →"}</button>
    {state==="error"&&<p className="sourceError">{error}</p>}
  </div>;
}
