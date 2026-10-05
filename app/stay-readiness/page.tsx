import type { Metadata } from "next";
import StayReadiness from "@/components/StayReadiness";
import SchengenCalculator from "@/components/SchengenCalculator";
import CountryRuleChecker from "@/components/CountryRuleChecker";
import { canonicalSiteUrl } from "@/src/system/site-url";

export const metadata:Metadata={
  title:"Long-Stay Readiness — Visa, Residence, Tax & Health Checks",
  description:"A practical pre-check for 30–90 day hotel stays: immigration windows, residence formalities, tax-residence risk and health coverage.",
  alternates:{canonical:canonicalSiteUrl()+"/stay-readiness"},
};

export default function StayReadinessPage(){
  return <main className="seoPage"><div className="shell">
    <section className="seoHero">
      <div className="eyebrow">STAY READINESS</div>
      <h1>A hotel booking<br/>does not make a stay legal.</h1>
      <p>Atlas separates accommodation from immigration, residence, tax and health obligations. This page is a planning aid, not legal, immigration, tax or medical advice.</p>
    </section>
    <StayReadiness duration={60}/>
    <SchengenCalculator/>
    <CountryRuleChecker/>
    <div className="seoGrid">
      <article className="card"><h2>1 · Immigration window</h2><p>For many non-EU travellers in the Schengen area, the familiar short-stay ceiling is 90 days in any rolling 180-day period. Previous travel matters, and hotel nights are not identical to presence days: a 90-night stay can span 91 counted calendar days because entry and exit both count.</p></article>
      <article className="card"><h2>2 · Residence formalities</h2><p>EU citizens can generally stay in another EU country for up to three months without residence registration, although reporting presence can still apply. Longer stays can trigger registration requirements.</p></article>
      <article className="card"><h2>3 · Tax residence</h2><p>Immigration permission and tax residence are different legal tests. Atlas should flag the issue, not pretend a generic day counter can decide where a person owes tax.</p></article>
      <article className="card"><h2>4 · Health cover</h2><p>Coverage depends on nationality, residence, public-health entitlements and private insurance. Travellers should confirm that routine and emergency care are covered for the destination and entire stay.</p></article>
    </div>
    <section className="editorialBody">
      <h2>Official references</h2>
      <p><a href="https://europa.eu/youreurope/citizens/residence/residence-rights/index_en.htm" target="_blank" rel="noreferrer">Your Europe — residence rights ↗</a></p>
      <p><a href="https://home-affairs.ec.europa.eu/policies/schengen/border-crossing/short-stay-calculator_en" target="_blank" rel="noreferrer">European Commission — Schengen short-stay calculator ↗</a></p>
      <p>Rules can change. Atlas links out to official sources rather than turning a static product rule into legal advice.</p>
    </section>
  </div></main>;
}
