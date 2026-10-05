import type { Metadata } from "next";
import { canonicalSiteUrl } from "@/src/system/site-url";
import { legalIdentity } from "@/src/system/legal";

export const metadata:Metadata={
  title:"About Atlas Long Stay",
  description:"Atlas is building the distribution layer for 30–90 day hotel stays: real hotel discovery, verified rates and private sourcing when public long-stay inventory is absent.",
  alternates:{canonical:canonicalSiteUrl()+"/about"},
};

export default function About(){
  const id=legalIdentity();
  return <main className="seoPage"><div className="shell">
    <section className="seoHero">
      <div className="eyebrow">ABOUT ATLAS</div>
      <h1>Hotels sell nights.<br/>Atlas is built for months.</h1>
      <p>Atlas Long Stay focuses on the 30–90 day gap between a short hotel trip and a residential lease. Searchable hotel identity, commercial supply and verified price evidence are deliberately separate layers.</p>
    </section>
    <div className="seoGrid">
      <article className="card"><h2>The consumer wedge</h2><p>One destination, one monthly accommodation budget, 30, 60 or 90 days. Winter-sun demand and the Canary Islands are the first commercial focus rather than an artificial round-the-world itinerary.</p></article>
      <article className="card"><h2>The supply wedge</h2><p>A hotel in the directory is not counted as inventory. Atlas first tries current commercial providers; when a rate is absent, a traveller can create a private-rate sourcing case that also enters Direct Hotel OS.</p></article>
      <article className="card"><h2>The business model</h2><p>Atlas is designed around transaction-aligned economics on eligible completed accommodation bookings, subject to partner agreements. Search and rate requests do not require a consumer subscription.</p></article>
      <article className="card"><h2>The moat we are trying to build</h2><p>Not an LLM search box: verified 30–90 day supply, demand history, sourcing response data, rate evidence, conversion history and destination-specific stay-readiness knowledge.</p></article>
      <article className="card"><h2>What Atlas will not fake</h2><p>No invented hotel price, no claim that discovery coverage equals contracted supply, no demo rate presented as current, and no claim that a hotel booking resolves immigration, tax or healthcare obligations.</p></article>
      <article className="card"><h2>Who operates Atlas</h2>{id.configured?<p><b>{id.operator}</b><br/>{id.country}<br/><a href={"mailto:"+id.email}>{id.email}</a></p>:<p>The commercial operator identity is a launch gate and is not yet configured. Atlas remains pre-commercial until it is.</p>}</article>
    </div>
    <div className="actions" style={{marginTop:28}}><a className="btn" href="/stays?q=Tenerife&duration=60">Explore the wedge →</a><a className="btn ghost" href="/for-hotels">Hotel proposition</a><a className="btn ghost" href="/system">System proof</a></div>
  </div></main>;
}
