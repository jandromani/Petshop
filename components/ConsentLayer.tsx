"use client";

import { useEffect,useState } from "react";
import { usePathname } from "next/navigation";
import { Analytics } from "@vercel/analytics/next";
import { SpeedInsights } from "@vercel/speed-insights/next";
import GoogleMeasurement from "@/components/GoogleMeasurement";
import { ANALYTICS_CONSENT,CONSENT_COOKIE,CONSENT_VERSION,CONSENT_VERSION_COOKIE,ESSENTIAL_CONSENT,consentChoice } from "@/src/privacy/consent";

function writeConsent(value:string){
  const secure=window.location.protocol==="https:"?"; Secure":"";
  const suffix="; Max-Age=31536000; Path=/; SameSite=Lax"+secure;
  document.cookie=CONSENT_COOKIE+"="+value+suffix;
  document.cookie=CONSENT_VERSION_COOKIE+"="+CONSENT_VERSION+suffix;
}

export default function ConsentLayer(){
  const [choice,setChoice]=useState<"unknown"|"analytics"|"essential">("unknown");
  const pathname=usePathname();const es=pathname==="/es"||pathname.startsWith("/es/");
  useEffect(()=>{setChoice(consentChoice(document.cookie));},[]);
  function choose(value:"analytics"|"essential"){writeConsent(value===ANALYTICS_CONSENT?ANALYTICS_CONSENT:ESSENTIAL_CONSENT);setChoice(value);window.location.reload();}
  return <>
    {choice==="analytics"&&<><Analytics/><SpeedInsights/><GoogleMeasurement/></>}
    {choice==="unknown"&&<div className="consentBanner" role="dialog" aria-label={es?"Preferencias de privacidad":"Privacy preference"}>
      <div><b>{es?"Tu privacidad importa.":"Your privacy matters."}</b><span>{es?"Atlas sólo usa analítica opcional con tu permiso.":"Atlas only uses optional analytics with your permission."}</span></div>
      <div className="consentActions">
        <button className="btn ghost" onClick={()=>choose("essential")}>{es?"Sólo esencial":"Essential only"}</button>
        <button className="btn lime" onClick={()=>choose("analytics")}>{es?"Permitir analítica":"Allow analytics"}</button>
        <a href="/cookies">{es?"Más información":"Learn more"}</a>
      </div>
    </div>}
  </>;
}
