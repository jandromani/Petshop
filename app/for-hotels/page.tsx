import type { Metadata } from "next";
import { canonicalSiteUrl } from "@/src/system/site-url";

export const metadata:Metadata={
  title:"For Hotels — 30–90 Day Demand | Atlas",
  description:"Atlas is building a managed distribution channel for 30–90 day hotel demand: private sourcing, allocated inventory, observable contract economics and Atlas Checkout when merchant gates are active.",
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
      <article className="card"><div className="eyebrow">DISTRIBUTION</div><h2>Private-rate + managed channel</h2><p>A hotel does not need to publish a universal monthly discount on the open web. Atlas can operate a request-and-verify flow and, where the contract allows it, hold allocated long-stay units for Atlas Checkout.</p></article>
      <article className="card"><div className="eyebrow">ECONOMICS</div><h2>Hotel net ≠ customer price</h2><p>Managed rates store the hotel net and customer-facing price separately. Platform revenue and take rate are calculated from completed orders, so Atlas never needs to present a target margin as if it were observed.</p></article>
      <article className="card"><div className="eyebrow">TRUTH</div><h2>No fake inventory</h2><p>A directory listing is not called supply. A direct rate is not published until evidence, validity, terms and a valid booking destination clear the publication gate.</p></article>
      <article className="card"><div className="eyebrow">PILOT</div><h2>Canary Islands first</h2><p>Atlas is narrowing the business-development problem on purpose: prove repeatable 30–90 day demand and partner supply in one winter-sun market before expanding the playbook.</p></article>
      <article className="card"><div className="eyebrow">SYSTEM</div><h2>Allocated inventory, not a handshake</h2><p>Direct Hotel OS tracks contract evidence, validity, hotel net, customer price, allocated units, reserved units and sold units. Merchant supply is fail-closed if any required evidence is missing.</p></article>
    </div>
    <section className="editorialBody">
      <h2>What Atlas is not claiming yet</h2>
      <p>Searchable hotel coverage is not the same thing as contracted inventory. Atlas will not present pilot targets as signed partners, a mapped hotel as a live rate, or a requested price as guaranteed availability.</p>
      <h2>The milestone that matters</h2>
      <p>The commercial proof is simple: repeatable partner supply, allocated 30–90 day units, completed stays, observed GMV and observed platform revenue in a focused destination. Affiliate redirects can help bootstrap coverage, but they are not the end-state thesis.</p>
    </section>
  </div></main>;
}
