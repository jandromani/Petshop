"use client";
import { useState,type FormEvent } from "react";
import { useRouter } from "next/navigation";

export default function HotelPortalClient({authorized}:{authorized:boolean}) {
  const router=useRouter();const [busy,setBusy]=useState(false);const [message,setMessage]=useState("");
  async function submit(event:FormEvent<HTMLFormElement>) {
    event.preventDefault();const form=new FormData(event.currentTarget);setBusy(true);setMessage("");
    const values=Object.fromEntries(form.entries());
    const body=authorized?{...values,minNights:Number(values.minNights),maxNights:Number(values.maxNights),maxGuests:Number(values.maxGuests),monthlyPrice:Number(values.monthlyPrice)}:values;
    const res=await fetch(authorized?"/api/hotel-portal/rates":"/api/hotel-portal/session",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify(body)}).catch(()=>null);
    setBusy(false);
    if(!res?.ok){setMessage(authorized?"Could not save. Check your dates, rate and access code.":"This code is invalid, expired or temporarily unavailable.");return;}
    setMessage(authorized?"Proposal saved as a draft. Atlas must review the agreement and booking terms before publication.":"");router.refresh();
  }
  if(!authorized)return <form className="partnerForm" onSubmit={submit}><h2>Enter your private access code</h2><p>Atlas issues a code after verifying your hotel contact. Codes expire after 7 days.</p><label>Access code<input name="code" type="password" required minLength={43} maxLength={43} autoComplete="off"/></label><button className="btn" disabled={busy}>{busy?"Checking…":"Open hotel portal →"}</button>{message&&<p role="alert">{message}</p>}<a href="/for-hotels#apply">Apply for access</a></form>;
  return <div className="partnerForm"><h2>Propose a long-stay rate</h2><p>Save your proposal for Atlas to review. Submitting a proposal does not publish availability or approve a commercial agreement.</p>
    <form onSubmit={submit}><div className="partnerFormGrid">
      <label>Minimum stay<select name="minNights" defaultValue="30">{[30,60,90].map(n=><option key={n}>{n}</option>)}</select></label>
      <label>Maximum stay<select name="maxNights" defaultValue="90">{[30,60,90].map(n=><option key={n}>{n}</option>)}</select></label>
      <label>Guests<select name="maxGuests" defaultValue="2"><option>1</option><option>2</option></select></label>
      <label>Price per 30 nights<input type="number" name="monthlyPrice" required min="0.01" max="100000" step="0.01"/></label>
      <label>Currency<select name="currency"><option>EUR</option><option>USD</option><option>GBP</option></select></label>
      <label>Meal plan<input name="board" required minLength={2} maxLength={80} placeholder="Room only, breakfast…"/></label>
      <label>Valid from<input type="date" name="validFrom" required/></label><label>Valid through<input type="date" name="validTo" required/></label>
      <label>Cancellation terms<textarea name="cancellation" required minLength={5} maxLength={1000}/></label>
    </div><button className="btn" disabled={busy}>{busy?"Saving…":"Submit rate for review →"}</button></form>
    {message&&<p role="status">{message}</p>}
    <button className="btn ghost" onClick={async()=>{const res=await fetch("/api/hotel-portal/session",{method:"DELETE"});if(res.ok)router.refresh()}}>Sign out</button>
  </div>;
}
