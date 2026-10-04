import type { Metadata } from "next";
import { legalIdentity } from "@/src/system/legal";

export const metadata:Metadata={title:"Terms of use",robots:{index:false,follow:false}};

export default function TermsPage(){
  const identity=legalIdentity();
  return <main className="seoPage"><div className="shell">
    <a className="eyebrow" href="/legal">← legal & commercial disclosure</a>
    <section className="seoHero" style={{marginTop:20}}>
      <div className="eyebrow">TERMS OF USE</div>
      <h1>Terms of use.</h1>
      <p style={{fontSize:20,maxWidth:780}}>These terms describe the intended Atlas operating model. Commercial launch remains blocked until the operator identity and final jurisdiction-specific review are complete.</p>
    </section>
    <div className="seoGrid">
      <div className="card"><h2>What Atlas does</h2><p>Atlas helps users compare long-stay living scenarios and verified commercial accommodation offers. A third-party hotel or booking provider normally completes the accommodation booking unless a future checkout explicitly states otherwise.</p></div>
      <div className="card"><h2>Verified vs prototype</h2><p>Prototype scenarios are planning examples, not bookable inventory. LIVE commercial offers require fresh deterministic evidence. Atlas may remove or degrade an offer when that evidence expires.</p></div>
      <div className="card"><h2>Prices and availability</h2><p>Commercial facts must come from provider or direct-contract evidence. Atlas does not guarantee future availability, exchange rates, taxes, visas, residency treatment or a provider's continued acceptance of an offer.</p></div>
      <div className="card"><h2>Referrals</h2><p>Atlas may receive a referral fee or commission when a user follows an eligible commercial link and completes a qualifying transaction.</p></div>
      <div className="card"><h2>No professional advice</h2><p>Atlas is not medical, legal, immigration, tax or investment advice. Long stays may create destination-specific obligations that must be checked independently.</p></div>
      <div className="card"><h2>Travel-service boundary</h2><p>Accommodation, transport, insurance, telemedicine and other services must not be assumed to form a package unless an explicitly reviewed future booking flow says so.</p></div>
    </div>
    <div className="card" style={{marginTop:24}}><h2>Operator</h2>{identity.configured
      ?<p><b>{identity.operator}</b> · {identity.country} · <a href={"mailto:"+identity.email}>{identity.email}</a></p>
      :<p><b>Not activated.</b> Operator identity/contact must be configured before these terms are used for a commercial launch.</p>}</div>
  </div></main>;
}
