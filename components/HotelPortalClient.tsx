"use client";
import { useCopy } from "@/components/useCopy";
import { useState,type FormEvent } from "react";
import { useRouter } from "next/navigation";

export default function HotelPortalClient({authorized}:{authorized:boolean}) {
  const {t,local,language}=useCopy();
  const router=useRouter();const [busy,setBusy]=useState(false);const [message,setMessage]=useState("");
  async function submit(event:FormEvent<HTMLFormElement>) {
    event.preventDefault();const form=new FormData(event.currentTarget);setBusy(true);setMessage("");
    const values=Object.fromEntries(form.entries());
    const body=authorized?{...values,minNights:Number(values.minNights),maxNights:Number(values.maxNights),maxGuests:Number(values.maxGuests),monthlyPrice:Number(values.monthlyPrice)}:values;
    const res=await fetch(authorized?"/api/hotel-portal/rates":"/api/hotel-portal/session",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify(body)}).catch(()=>null);
    setBusy(false);
    if(!res?.ok){setMessage(authorized?t("Could not save. Check your dates, rate and access code."):t("This code is invalid, expired or temporarily unavailable."));return;}
    setMessage(authorized?t("Proposal saved as a draft. Atlas must review the agreement and booking terms before publication."):"");router.refresh();
  }
  if(!authorized)return <form className="partnerForm" onSubmit={submit}><h2>{t("Enter your private access code")}</h2><p>{t("Atlas issues a code after verifying your hotel contact. Codes expire after 7 days.")}</p><label>{t("Access code")}<input name="code" type="password" required minLength={43} maxLength={43} autoComplete="off"/></label><button className="btn" disabled={busy}>{busy?t("Checking…"):t("Open hotel portal →")}</button>{message&&<p role="alert">{message}</p>}<a href={local("/for-hotels#apply")}>{t("Apply for access")}</a></form>;
  return <div className="partnerForm"><h2>{t("Propose a long-stay rate")}</h2><p>{t("Save your proposal for Atlas to review. Submitting a proposal does not publish availability or approve a commercial agreement.")}</p>
    <form onSubmit={submit}><div className="partnerFormGrid">
      <label>{t("Minimum stay")}<select name="minNights" defaultValue="30">{[30,60,90].map(n=><option key={n}>{n}</option>)}</select></label>
      <label>{t("Maximum stay")}<select name="maxNights" defaultValue="90">{[30,60,90].map(n=><option key={n}>{n}</option>)}</select></label>
      <label>{t("Guests")}<select name="maxGuests" defaultValue="2"><option>1</option><option>2</option></select></label>
      <label>{t("Price per 30 nights")}<input type="number" name="monthlyPrice" required min="0.01" max="100000" step="0.01"/></label>
      <label>{t("Currency")}<select name="currency"><option>{t("EUR")}</option><option>{t("USD")}</option><option>{t("GBP")}</option></select></label>
      <label>{t("Meal plan")}<input name="board" required minLength={2} maxLength={80} placeholder={t("Room only, breakfast…")}/></label>
      <label>{t("Valid from")}<input type="date" name="validFrom" required/></label><label>{t("Valid through")}<input type="date" name="validTo" required/></label>
      <label>{t("Cancellation terms")}<textarea name="cancellation" required minLength={5} maxLength={1000}/></label>
    </div><button className="btn" disabled={busy}>{busy?t("Saving…"):t("Submit rate for review →")}</button></form>
    {message&&<p role="status">{message}</p>}
    <button className="btn ghost" onClick={async()=>{const res=await fetch("/api/hotel-portal/session",{method:"DELETE"});if(res.ok)router.refresh()}}>{t("Sign out")}</button>
  </div>;
}
