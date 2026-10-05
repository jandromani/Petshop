import type { Metadata } from "next";
import { canonicalSiteUrl } from "@/src/system/site-url";

export const metadata:Metadata={
  title:"Atlas Data, Supply & Rate Methodology",
  description:"How Atlas separates hotel identity, commercial supply, private sourcing and verified monthly-equivalent rates for 30–90 day stays.",
  alternates:{canonical:canonicalSiteUrl()+"/methodology"}
};

export default function Methodology(){
  return <main className="seoPage"><div className="shell">
    <section className="seoHero"><div className="eyebrow">METHODOLOGY</div><h1>Discovery, supply and price<br/>are three different claims.</h1><p>Atlas keeps those layers separate so a searchable hotel can never silently become “inventory”, and an estimated planning value can never become a live rate.</p></section>
    <div className="seoGrid">
      <article className="card"><h2>1 · Hotel identity</h2><p>Atlas reconciles real-world hotel identity, location, address, website and source provenance. Identity proves that the property is a real discovery object; it does not prove bookability.</p></article>
      <article className="card"><h2>2 · Commercial supply</h2><p>A hotel becomes supply only when Atlas has current commercial evidence and a valid fulfillment path for the requested stay. Searchable directory coverage is reported separately from verified supply.</p></article>
      <article className="card"><h2>3 · Private sourcing</h2><p>When public supply is absent, a traveller can create a 30, 60 or 90 day sourcing case with dates, occupancy, target budget and a contact email. Atlas may try configured commercial providers and a Direct Hotel OS fallback.</p></article>
      <article className="card"><h2>4 · Monthly equivalent</h2><p>For a real total stay price, Atlas calculates <b>(total price ÷ nights) × 30</b>. The provider total is preserved; the monthly figure is a comparison unit, not a new quote.</p></article>
      <article className="card"><h2>5 · Rate freshness</h2><p>Commercial offers carry verification and expiry timestamps. Expired evidence is removed from sellable results and cannot keep an SEO page indexable.</p></article>
      <article className="card"><h2>6 · Direct hotel gate</h2><p>A direct hotel rate is not published until contract evidence, validity, cancellation terms and an approved booking destination clear the publication gate.</p></article>
      <article className="card"><h2>7 · Content rights</h2><p>Atlas only displays third-party hotel content when storage/display rights and provenance are recorded. Missing content is preferable to unsupported rights.</p></article>
      <article className="card"><h2>8 · Stay readiness</h2><p>Accommodation evidence does not decide immigration, residence, tax or health eligibility. Atlas surfaces those constraints separately and links to official sources.</p></article>
    </div>
    <div className="actions" style={{marginTop:26}}><a className="btn" href="/trust">Trust Center →</a><a className="btn ghost" href="/stay-readiness">Stay readiness</a><a className="btn ghost" href="/system">Technical proof</a></div>
  </div></main>;
}
