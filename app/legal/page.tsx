import type { Metadata } from "next";
import { legalIdentity } from "@/src/system/legal";

export const metadata:Metadata={title:"Commercial & privacy disclosure",robots:{index:false,follow:false}};

export default function LegalPage(){
  const identity=legalIdentity();
  const retention=process.env.DATA_RETENTION_DAYS||"90";
  return <main className="seoPage"><div className="shell">
    <a className="eyebrow" href="/">← Atlas Long Stay</a>
    <section className="seoHero" style={{marginTop:20}}>
      <div className="eyebrow">COMMERCIAL + DATA DISCLOSURE</div>
      <h1>How Atlas makes money<br/>and what “supply” means.</h1>
      <p style={{fontSize:20,maxWidth:780}}>Atlas is built around transaction-aligned accommodation economics. Provider referrals can generate a referral fee; managed direct supply can generate the contractual difference between the customer price and the hotel net. Searching and requesting a private rate are not consumer subscription products.</p>
      <p><a href="/privacy">Privacy notice</a> · <a href="/terms">Terms of use</a> · <a href="/cookies">Cookies & analytics</a></p>
    </section>
    <div className="seoGrid">
      <div className="card"><h2>One initial business model</h2><p>Atlas is designed to earn when accommodation demand converts into an eligible booking. Referral offers are completed by the external hotel or booking provider. Offers explicitly labelled Atlas Checkout use Atlas’ payment flow only after contract, inventory and merchant-payment gates are active.</p><p>Commission must never change the hotel price shown to the traveller or allow an unsupported price to appear.</p></div>
      <div className="card"><h2>Discovery is not supply</h2><p>A real hotel identity can be searchable without being bookable. Atlas counts a rate as commercial supply only while current evidence, dates, terms and a valid fulfillment path exist.</p><p>When no verified rate exists, Atlas can accept a private-rate sourcing request rather than silently substitute demo inventory.</p></div>
      <div className="card"><h2>Atlas Checkout</h2><p>Managed direct rates keep the hotel net, customer price and allocated inventory as separate evidence. Checkout is fail-closed unless the rate is contract verified, merchant terms are verified, allocated inventory remains and the production payment processor is configured.</p><p>Payment state is not silently treated as hotel-service delivery. Atlas keeps order/payment state and accommodation confirmation as distinct records.</p></div><div className="card"><h2>Private-rate requests</h2><p>If you explicitly ask Atlas to source a stay, the request may include your email address, dates, occupancy and target monthly budget. Atlas uses that contact information to operate the request and return a verified quote or status update.</p><p>Automated email delivery only operates when the production email service is configured; otherwise the case remains visible to authorized Atlas operations.</p></div>
      <div className="card"><h2>Important limits</h2><p>Atlas is not medical, tax, immigration, residency or legal advice. Long stays can create country-specific obligations and immigration stay limits are not the same test as tax residence.</p><p>Transport, insurance and other services are not bundled with accommodation unless a booking flow explicitly states otherwise.</p></div>
      <div className="card"><h2>Data & attribution</h2><p>With analytics consent, Atlas may store pseudonymous product events. Referral clicks and conversion evidence may be recorded when needed to reconcile the specific referral and commercial payment. General analytics/pseudonymous event retention is configured at approximately {retention} days.</p></div>
      <div className="card"><h2>Truth gate</h2><p>Provider/API offers are labelled live only while their evidence is fresh. Direct hotel rates require contract evidence, validity, terms and an approved booking destination before publication.</p></div>
    </div>
    <div className="card" style={{marginTop:24}}><div className="eyebrow">OPERATOR</div>{identity.configured?<p><b>{identity.operator}</b><br/>{identity.country}<br/><a href={"mailto:"+identity.email}>{identity.email}</a></p>:<p><b>Launch gate not complete.</b> Operator name, contact email and operating country must be configured before commercial launch.</p>}</div>
  </div></main>;
}
