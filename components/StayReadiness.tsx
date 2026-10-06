"use client";
import { useCopy } from "@/components/useCopy";

import { useMemo,useState } from "react";
import type { StayDuration } from "@/src/core/search";

type Citizenship="eu"|"non-eu";
type Destination="eu"|"schengen"|"other";

export default function StayReadiness({duration=60}:{duration?:StayDuration}){
  const {t,local,language}=useCopy();
  const[citizenship,setCitizenship]=useState<Citizenship>("eu");
  const[destination,setDestination]=useState<Destination>("eu");
  const finding=useMemo(()=>{
    if(citizenship==="eu"&&destination==="eu"){
      return duration<=90
        ?{tone:"green",title:"Inside the first three-month planning window",body:"EU citizens can generally stay in another EU country for up to three months without registering as a resident, although some countries can require reporting your presence."}
        :{tone:"amber",title:"Residence formalities may apply",body:"After the first three months, the host country may require residence registration and supporting documents."};
    }
    if(citizenship==="non-eu"&&(destination==="eu"||destination==="schengen")){
      return{tone:"amber",title:"Check the Schengen 90/180 calculation",body:"For many non-EU travellers, short stays in the Schengen area are limited to 90 days in any rolling 180-day period. Previous travel, visas and residence permits can change the calculation."};
    }
    return{tone:"amber",title:"Country-specific rules apply",body:"Entry permission, permitted stay length and registration rules depend on nationality, residence status and destination. Atlas does not infer them from a hotel booking."};
  },[citizenship,destination,duration]);

  return <section className="readinessBand"><div className="shell readinessGrid">
    <div><div className="eyebrow">{t("STAY READINESS · NOT LEGAL OR TAX ADVICE")}</div><h2>{t("A 60-day hotel stay")}<br/>{t("is still an immigration decision.")}</h2><p>{t("Atlas makes the constraint visible before checkout instead of pretending accommodation is the only thing that matters.")}</p><a href={local("/stay-readiness")}>{t("Open the full readiness guide →")}</a></div>
    <div className="readinessCard">
      <div className="readinessControls">
        <label><span>{t("Traveller")}</span><select value={citizenship} onChange={e=>setCitizenship(e.target.value as Citizenship)}><option value="eu">{t("EU citizen")}</option><option value="non-eu">{t("Non-EU citizen")}</option></select></label>
        <label><span>{t("Destination")}</span><select value={destination} onChange={e=>setDestination(e.target.value as Destination)}><option value="eu">{t("EU country")}</option><option value="schengen">{t("Schengen area")}</option><option value="other">{t("Outside EU/Schengen")}</option></select></label>
      </div>
      <div className={"readinessFinding "+finding.tone}><b>{t(finding.title)}</b><p>{t(finding.body)}</p></div>
      <div className="readinessChecks"><span>{t("✓ Visa / residence window")}</span><span>{t("✓ Tax-residence implications")}</span><span>{t("✓ Health coverage")}</span></div>
      <p className="readinessNote">{t("Immigration limits and tax residence are different tests. Confirm both with official authorities for your circumstances.")}</p>
      <div className="readinessLinks"><a href="https://europa.eu/youreurope/citizens/residence/residence-rights/index_en.htm" target="_blank" rel="noreferrer">{t("EU residence rights ↗")}</a><a href="https://home-affairs.ec.europa.eu/policies/schengen/border-crossing/short-stay-calculator_en" target="_blank" rel="noreferrer">{t("Official Schengen calculator ↗")}</a></div>
    </div>
  </div></section>;
}
