import type { Metadata } from "next";
import { canonicalSiteUrl } from "@/src/system/site-url";

export const metadata:Metadata={
  title:"For Hotels — 30–90 Day Demand | Atlas",
  description:"Atlas is building a distribution channel for 30–90 day hotel demand, with private-rate sourcing and transaction-aligned commercial economics.",
  alternates:{canonical:canonicalSiteUrl()+"/for-hotels"},
};

export default function ForHotels(){
  return <main className="seoPage"><div className="shell">
    <section className="seoHero">
      <div className="eyebrow">FOR HOTELS · PILOT SUPPLY</div>
      <h1>Fill a month.<br/>Not another night.</h1>
      <p>Atlas is building a focused demand channel for guests who want one hotel for 30, 60 or 90 days. The first commercial wedge is winter-sun demand, beginning with the Canary Islands.</p>
      <div className="actions"><a className="btn" href="/contact">Talk to Atlas →</a><a className="btn ghost" href="/methodology">How rates are verified</a></div>
    </section>
    <div className="seoGrid">
      <article className="card"><div className="eyebrow">DEMAND</div><h2>Longer intent</h2><p>Atlas captures exact dates, stay length, occupancy and a monthly target before an unpriced request enters the sourcing queue.</p></article>
      <article className="card"><div className="eyebrow">DISTRIBUTION</div><h2>Private-rate capable</h2><p>A hotel does not need to publish a universal monthly discount on the open web. Atlas can operate a request-and-verify flow subject to the eventual partner agreement and rate rules.</p></article>
      <article className="card"><div className="eyebrow">ECONOMICS</div><h2>Aligned to conversion</h2><p>The initial model is designed around eligible completed accommodation bookings rather than charging travellers to search.</p></article>
      <article className="card"><div className="eyebrow">TRUTH</div><h2>No fake inventory</h2><p>A directory listing is not called supply. A direct rate is not published until evidence, validity, terms and a valid booking destination clear the publication gate.</p></article>
      <article className="card"><div className="eyebrow">PILOT</div><h2>Canary Islands first</h2><p>Atlas is narrowing the business-development problem on purpose: prove repeatable 30–90 day demand and partner supply in one winter-sun market before expanding the playbook.</p></article>
      <article className="card"><div className="eyebrow">SYSTEM</div><h2>Built to scale the workflow</h2><p>Rate requests become sourcing cases, provider probes where configured, hotel leads in Direct Hotel OS, evidence-gated offers and conversion attribution.</p></article>
    </div>
    <section className="editorialBody">
      <h2>What Atlas is not claiming yet</h2>
      <p>Searchable hotel coverage is not the same thing as contracted inventory. Atlas will not present pilot targets as signed partners, a mapped hotel as a live rate, or a requested price as guaranteed availability.</p>
      <h2>The milestone that matters</h2>
      <p>The commercial proof is simple: repeatable partner supply, verified 30–90 day rates, completed stays and transaction revenue in a focused destination. Everything else is infrastructure for that loop.</p>
    </section>
  </div></main>;
}
