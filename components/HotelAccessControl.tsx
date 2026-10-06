"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";

export default function HotelAccessControl({leadId}:{leadId:string}) {
  const router=useRouter();const [verified,setVerified]=useState(false);const [busy,setBusy]=useState(false);
  const [access,setAccess]=useState<{token:string;expiresAt:string}|null>(null);const [error,setError]=useState("");
  async function issue() {
    setBusy(true);setError("");
    const res=await fetch("/api/hotel-desk/access",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({hotelLeadId:leadId,contactVerified:verified})}).catch(()=>null);
    const data=await res?.json().catch(()=>null);setBusy(false);
    if(!res?.ok){setError("Could not issue access. Verify the lead and database connection.");return;}setAccess(data);router.refresh();
  }
  return <div className="partnerOpsCard"><label className="partnerConsent"><input type="checkbox" checked={verified} onChange={e=>setVerified(e.target.checked)}/><span>I verified this person's authority to represent the hotel.</span></label>
    <button className="btn" disabled={!verified||busy||Boolean(access)} onClick={issue}>{busy?"Issuing…":"Issue 7-day portal code"}</button>
    {access&&<div role="status"><p>Code shown once. Deliver privately to the verified contact; it grants access to this hotel's proposals.</p><input aria-label="New hotel access code" type="password" readOnly value={access.token}/><button className="btn ghost" onClick={async()=>{try{await navigator.clipboard.writeText(access.token)}catch{setError("Select and copy the code manually.")}}}>Copy code</button><p>Portal: /hotel-portal · expires {access.expiresAt}</p></div>}{error&&<p role="alert">{error}</p>}
  </div>;
}

export function RevokeHotelAccess({id}:{id:string}) {
  const router=useRouter();const [busy,setBusy]=useState(false);const [error,setError]=useState(false);
  return <><button className="btn ghost" disabled={busy} onClick={async()=>{setBusy(true);const res=await fetch("/api/hotel-desk/access",{method:"DELETE",headers:{"Content-Type":"application/json"},body:JSON.stringify({id})}).catch(()=>null);setBusy(false);setError(!res?.ok);if(res?.ok)router.refresh()}}>Revoke access</button>{error&&<span role="alert">Revocation failed</span>}</>;
}
