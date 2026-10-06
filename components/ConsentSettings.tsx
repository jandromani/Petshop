"use client";

import { useCopy } from "@/components/useCopy";
import { useEffect,useState } from "react";
import { ANALYTICS_CONSENT,CONSENT_COOKIE,CONSENT_VERSION,CONSENT_VERSION_COOKIE,ESSENTIAL_CONSENT,consentChoice } from "@/src/privacy/consent";

const OPTIONAL_COOKIES=["rv_vid","rv_sid","rv_src","rv_med","rv_campaign","rv_term","rv_content","rv_ref","rv_gclid","rv_gbraid","rv_wbraid","rv_msclkid"];

function setCookie(name:string,value:string,maxAge:number){
  const secure=window.location.protocol==="https:"?"; Secure":"";
  document.cookie=name+"="+value+"; Max-Age="+maxAge+"; Path=/; SameSite=Lax"+secure;
}

function clearOptional(){
  for(const name of OPTIONAL_COOKIES)setCookie(name,"",0);
}

export default function ConsentSettings(){
  const {t}=useCopy();
  const [choice,setChoice]=useState<"analytics"|"essential"|"unknown">("unknown");

  useEffect(()=>{
    setChoice(consentChoice(document.cookie));
  },[]);

  function save(next:"analytics"|"essential"){
    if(next==="essential")clearOptional();
    setCookie(CONSENT_COOKIE,next===ANALYTICS_CONSENT?ANALYTICS_CONSENT:ESSENTIAL_CONSENT,31536000);
    setCookie(CONSENT_VERSION_COOKIE,CONSENT_VERSION,31536000);
    setChoice(next);
    window.location.reload();
  }

  return <div className="card" style={{marginTop:24}}>
    <div className="eyebrow">{t("PRIVACY CONTROLS")}</div>
    <h2>{t("Analytics preference")}</h2>
    <p>Current choice: <b>{choice==="analytics"?t("Analytics allowed"):choice==="essential"?t("Essential only"):t("Renewal required")}</b>.</p>
    <div style={{display:"flex",gap:12,flexWrap:"wrap"}}>
      <button className="btn ghost" onClick={()=>save("essential")}>{t("Use essential only")}</button>
      <button className="btn lime" onClick={()=>save("analytics")}>{t("Allow analytics")}</button>
    </div>
    <p style={{fontSize:13,opacity:.75}}>{t("Switching to essential-only removes optional analytics and campaign cookies when this page reloads. Consent contract:")} {CONSENT_VERSION}.</p>
  </div>;
}
