"use client";

import { useEffect,useState } from "react";
import { Analytics } from "@vercel/analytics/next";
import { SpeedInsights } from "@vercel/speed-insights/next";
import { ANALYTICS_CONSENT,CONSENT_COOKIE,CONSENT_VERSION,CONSENT_VERSION_COOKIE,ESSENTIAL_CONSENT,consentChoice } from "@/src/privacy/consent";

function writeConsent(value:string){
  const secure=window.location.protocol==="https:"?"; Secure":"";
  const suffix="; Max-Age=31536000; Path=/; SameSite=Lax"+secure;
  document.cookie=CONSENT_COOKIE+"="+value+suffix;
  document.cookie=CONSENT_VERSION_COOKIE+"="+CONSENT_VERSION+suffix;
}

export default function ConsentLayer(){
  const [choice,setChoice]=useState<"unknown"|"analytics"|"essential">("unknown");
  useEffect(()=>{
    setChoice(consentChoice(document.cookie));
  },[]);

  function choose(value:"analytics"|"essential"){
    writeConsent(value===ANALYTICS_CONSENT?ANALYTICS_CONSENT:ESSENTIAL_CONSENT);
    setChoice(value);
    window.location.reload();
  }

  return <>
    {choice==="analytics"&&<><Analytics/><SpeedInsights/></>}
    {choice==="unknown"&&<div className="consentBanner" role="dialog" aria-label="Analytics preference">
      <div><b>Privacy choice</b><span>Atlas can work with essential storage only. Optional analytics helps measure searches, shares and referrals. Material consent changes require a fresh choice.</span></div>
      <div className="consentActions">
        <button className="btn ghost" onClick={()=>choose("essential")}>Essential only</button>
        <button className="btn lime" onClick={()=>choose("analytics")}>Allow analytics</button>
        <a href="/legal">Details</a>
      </div>
    </div>}
  </>;
}
