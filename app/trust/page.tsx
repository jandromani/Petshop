import type { Metadata } from "next";

export const metadata:Metadata={title:"Trust Center",description:"How Atlas verifies hotels, prices and privacy without exposing engineering jargon.",robots:{index:false,follow:true}};

export default function TrustPage(){
  return <main className="seoPage trustCenter"><div className="shell">
    <a href="/" className="backLink">← Atlas</a>
    <section className="seoHero trustHero"><div className="eyebrow">ATLAS TRUST CENTER</div><h1>Prices you can trust.<br/>Without the technical lecture.</h1><p>Atlas separates a real hotel from a verified price. That means you can explore freely without us pretending that an old, estimated or invented rate is bookable today.</p></section>
    <section className="consumerTrustGrid">
      <article><span>01</span><h2>Real hotel</h2><p>We check that the property exists and map it to a real place before it appears in search.</p></article>
      <article><span>02</span><h2>Verified rate</h2><p>A price only appears as available when Atlas has current commercial evidence for the stay.</p></article>
      <article><span>03</span><h2>Expired? Removed.</h2><p>Old prices stop being presented as current. If we cannot verify a price, we say so.</p></article>
      <article><span>04</span><h2>Your budget stays private</h2><p>The concierge receives the travel preferences it needs, not your full finance breakdown.</p></article>
    </section>
    <section className="trustTechnical"><div><div className="eyebrow">WANT THE DETAILS?</div><h2>Technical proof is still public.</h2><p>Engineers, partners and auditors can inspect system readiness, provider state and verification controls separately from the consumer experience.</p></div><div className="actions"><a className="btn" href="/system">See technical proof →</a><a className="btn ghost" href="/legal">Legal & commercial disclosure</a></div></section>
  </div></main>;
}