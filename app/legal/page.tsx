import type { Metadata } from "next";
import { legalIdentity } from "@/src/system/legal";

export const metadata:Metadata={
  title:"Commercial & privacy disclosure",
  robots:{index:false,follow:false},
};

export default function LegalPage(){
  const identity=legalIdentity();
  const retention=process.env.DATA_RETENTION_DAYS||"90";
  return <main className="seoPage"><div className="shell">
    <a className="eyebrow" href="/">← Atlas Long Stay</a>
    <section className="seoHero" style={{marginTop:20}}>
      <div className="eyebrow">COMMERCIAL + DATA DISCLOSURE</div>
      <h1>How Atlas makes money<br/>and what “live” means.</h1>
      <p style={{fontSize:20,maxWidth:780}}>Atlas compares long-stay living options and can refer you to a hotel or booking provider. The commercial destination—not Atlas—normally completes the accommodation booking unless a future checkout explicitly says otherwise.</p>
    </section>

    <div className="seoGrid">
      <div className="card">
        <h2>Referral economics</h2>
        <p>Atlas may receive a commission or referral fee after you follow a commercial link and complete an eligible booking. This does not allow Atlas to invent or alter a provider price.</p>
        <p>Provider/API offers are labelled LIVE only while their stored evidence is fresh. Direct hotel offers are labelled LIVE only after contract evidence, validity, cancellation terms and an approved booking hostname pass the publication gate.</p>
      </div>
      <div className="card">
        <h2>Prototype vs live</h2>
        <p>Prototype catalogue cards are planning scenarios and are not presented as bookable inventory. They are intentionally excluded from commercial SEO indexing.</p>
        <p>Where no verified live offer exists, Atlas shows that state rather than silently substituting demo inventory.</p>
      </div>
      <div className="card">
        <h2>Data used to operate the product</h2>
        <p>Atlas may store pseudonymous visitor/session identifiers, attribution parameters, product events, referral clicks and conversion evidence so the funnel and partner commissions can be reconciled.</p>
        <p>Operational retention is configured at approximately {retention} days for analytics/pseudonymous event data; older referral identifiers and raw conversion payloads are scrubbed by the daily control workflow.</p>
      </div>
      <div className="card">
        <h2>Important limits</h2>
        <p>Atlas is not medical, tax, immigration, residency or legal advice. Long stays can create country-specific obligations that must be checked for the traveller and destination.</p>
        <p>Transport, insurance and other travel services should not be assumed bundled with accommodation unless the booking flow explicitly states that they are.</p>
      </div>
    </div>

    <div className="card" style={{marginTop:24}}>
      <div className="eyebrow">OPERATOR</div>
      {identity.configured
        ? <p><b>{identity.operator}</b><br/>{identity.country}<br/><a href={"mailto:"+identity.email}>{identity.email}</a></p>
        : <p><b>Launch gate not complete.</b> Operator name, contact email and operating country must be configured before commercial launch.</p>}
    </div>
  </div></main>;
}
