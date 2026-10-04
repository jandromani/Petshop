"use client";

import { useEffect,useState } from "react";
import { ANALYTICS_CONSENT,CONSENT_COOKIE,ESSENTIAL_CONSENT,hasAnalyticsConsent } from "@/src/privacy/consent";

const OPTIONAL_COOKIES=["rv_vid","rv_sid","rv_src","rv_med","rv_campaign","rv_term","rv_content","rv_ref"];

function setCookie(name:string,value:string,maxAge:number){
  const secure=window.location.protocol==="https:"?"; Secure":"";
  document.cookie=name+"="+value+"; Max-Age="+maxAge+"; Path=/; SameSite=Lax"+secure;
}

function clearOptional(){
  for(const name of OPTIONAL_COOKIES)setCookie(name,"",0);
}

export default function ConsentSettings(){
  const [choice,setChoice]=useState<"analytics"|"essential">("essential");

  useEffect(()=>{
    setChoice(hasAnalyticsConsent(document.cookie)?"analytics":"essential");
  },[]);

  function save(next:"analytics"|"essential"){
    if(next==="essential")clearOptional();
    setCookie(CONSENT_COOKIE,next===ANALYTICS_CONSENT?ANALYTICS_CONSENT:ESSENTIAL_CONSENT,31536000);
    setChoice(next);
    window.location.reload();
  }

  return <div className="card" style={{marginTop:24}}>
    <div className="eyebrow">PRIVACY CONTROLS</div>
    <h2>Analytics preference</h2>
    <p>Current choice: <b>{choice==="analytics"?"Analytics allowed":"Essential only"}</b>.</p>
    <div style={{display:"flex",gap:12,flexWrap:"wrap"}}>
      <button className="btn ghost" onClick={()=>save("essential")}>Use essential only</button>
      <button className="btn lime" onClick={()=>save("analytics")}>Allow analytics</button>
    </div>
    <p style={{fontSize:13,opacity:.75}}>Switching to essential-only removes Atlas optional visitor/session and campaign cookies from this browser immediately.</p>
  </div>;
}
