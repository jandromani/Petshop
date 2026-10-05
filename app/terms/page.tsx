import type { Metadata } from "next";
import { LEGAL_DOCUMENT_VERSION,legalIdentity } from "@/src/system/legal";

export const metadata:Metadata={title:"Terms of use",robots:{index:false,follow:false}};

export default function TermsPage(){
  const identity=legalIdentity();
  return <main className="seoPage"><div className="shell">
    <a className="eyebrow" href="/legal">← legal & commercial disclosure</a>
    <section className="seoHero" style={{marginTop:20}}>
      <div className="eyebrow">TERMS OF USE · {LEGAL_DOCUMENT_VERSION}</div>
      <h1>Terms of use.</h1>
      <p style={{fontSize:20,maxWidth:780}}>Atlas is built for 30–90 day hotel stays. Commercial launch remains blocked until the operator identity and final jurisdiction-specific review are complete.</p>
    </section>
    <div className="seoGrid">
      <div className="card"><h2>What Atlas does</h2><p>Atlas helps travellers discover real hotels, compare current long-stay commercial evidence and create a private-rate sourcing request when no verified rate exists. A third-party hotel or booking provider normally completes the accommodation booking unless a future checkout explicitly states otherwise.</p></div>
      <div className="card"><h2>Discovery is not inventory</h2><p>A searchable hotel identity is not a promise of availability, a contract or a live rate. Atlas only presents a commercial price when current evidence and a valid fulfillment path exist.</p></div>
      <div className="card"><h2>Private sourcing</h2><p>A sourcing request is an instruction to look for a commercial rate, not a guarantee that a hotel will quote, accept the target budget or remain available. Contact data supplied for a request is handled under the privacy notice.</p></div>
      <div className="card"><h2>Prices and availability</h2><p>Commercial facts must come from provider or direct-contract evidence. Atlas does not guarantee future availability, exchange rates, taxes or a provider's continued acceptance of an offer.</p></div>
      <div className="card"><h2>How Atlas can earn</h2><p>Atlas is designed around transaction-aligned referral or distribution economics on eligible completed accommodation bookings under the relevant partner agreement. Searching or requesting a rate does not require a consumer subscription.</p></div>
      <div className="card"><h2>No professional advice</h2><p>Atlas is not medical, legal, immigration, residency, tax or investment advice. Immigration stay limits and tax residence are separate questions and must be checked for the traveller and destination.</p></div>
    </div>
    <div className="card" style={{marginTop:24}}><h2>Operator</h2>{identity.configured
      ?<p><b>{identity.operator}</b> · {identity.country} · <a href={"mailto:"+identity.email}>{identity.email}</a></p>
      :<p><b>Not activated.</b> Operator identity/contact must be configured before these terms are used for a commercial launch.</p>}</div>
  </div></main>;
}
