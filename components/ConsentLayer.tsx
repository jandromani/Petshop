"use client";

import { useEffect,useState } from "react";
import { Analytics } from "@vercel/analytics/next";
import { SpeedInsights } from "@vercel/speed-insights/next";
import { ANALYTICS_CONSENT,CONSENT_COOKIE,ESSENTIAL_CONSENT,hasAnalyticsConsent } from "@/src/privacy/consent";

function writeConsent(value:string){
  const secure=window.location.protocol==="https:"?"; Secure":"";
  document.cookie=CONSENT_COOKIE+"="+value+"; Max-Age=31536000; Path=/; SameSite=Lax"+secure;
}

export default function ConsentLayer(){
  const [choice,setChoice]=useState<"unknown"|"analytics"|"essential">("unknown");
  useEffect(()=>{
    const raw=document.cookie;
    setChoice(hasAnalyticsConsent(raw)?"analytics":raw.includes(CONSENT_COOKIE+"="+ESSENTIAL_CONSENT)?"essential":"unknown");
  },[]);

  function choose(value:"analytics"|"essential"){
    writeConsent(value===ANALYTICS_CONSENT?ANALYTICS_CONSENT:ESSENTIAL_CONSENT);
    setChoice(value);
    window.location.reload();
  }

  return <>
    {choice==="analytics"&&<><Analytics/><SpeedInsights/></>}
    {choice==="unknown"&&<div className="consentBanner" role="dialog" aria-label="Analytics preference">
      <div><b>Privacy choice</b><span>Atlas can work with essential storage only. Optional analytics helps measure searches, shares and referrals.</span></div>
      <div className="consentActions">
        <button className="btn ghost" onClick={()=>choose("essential")}>Essential only</button>
        <button className="btn lime" onClick={()=>choose("analytics")}>Allow analytics</button>
        <a href="/legal">Details</a>
      </div>
    </div>}
  </>;
}
