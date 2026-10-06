"use client";
import { useState,type FormEvent } from "react";

export default function HotelApplicationForm() {
  const [state,setState]=useState<"idle"|"sending"|"done"|"error">("idle");
  const [error,setError]=useState("");
  async function submit(event:FormEvent<HTMLFormElement>) {
    event.preventDefault();const form=new FormData(event.currentTarget);setState("sending");
    const input=Object.fromEntries(form.entries());
    const res=await fetch("/api/hotels/apply",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({...input,contactConsent:form.get("contactConsent")==="on"})}).catch(()=>null);
    setState(res?.ok?"done":"error");setError(res?.status===429?"Too many applications. Please try again later.":"Could not send your application. Check the details and try again.");
  }
  if(state==="done")return <div className="partnerSuccess" role="status"><h3>Application received.</h3><p>Atlas will review your hotel and contact details. After contact verification, you can receive a private portal code to propose 30, 60 or 90 day rates.</p><p>Your hotel has not been published and no payment has been taken.</p></div>;
  return <form className="partnerForm" onSubmit={submit}>
    <div className="partnerFormGrid">
      <label>Hotel name<input name="hotelName" required minLength={2} maxLength={200} autoComplete="organization"/></label>
      <label>Official website<input name="website" required type="url" maxLength={500} placeholder="https://your-hotel.com"/></label>
      <label>City / island<input name="city" required minLength={2} maxLength={120}/></label>
      <label>Country<input name="country" required minLength={2} maxLength={120}/></label>
      <label>Your name<input name="contactName" required minLength={2} maxLength={160} autoComplete="name"/></label>
      <label>Your role<input name="contactRole" required minLength={2} maxLength={160} placeholder="Owner, sales manager…"/></label>
      <label>Business email<input name="contactEmail" type="email" required maxLength={254} autoComplete="email"/></label>
    </div>
    <label className="partnerTrap" aria-hidden="true">Company<input name="company" tabIndex={-1} autoComplete="off"/></label>
    <label className="partnerConsent"><input name="contactConsent" type="checkbox" required/><span>I represent this hotel and agree that Atlas may use these details to review this partnership application. <a href="/privacy">Privacy policy</a>.</span></label>
    <button className="btn" disabled={state==="sending"}>{state==="sending"?"Sending…":"Apply for the hotel pilot →"}</button>
    {state==="error"&&<p role="alert">{error}</p>}
  </form>;
}
