import type { Metadata } from "next";
import { LEGAL_DOCUMENT_VERSION,legalIdentity } from "@/src/system/legal";
import ConsentSettings from "@/components/ConsentSettings";

export const metadata:Metadata={title:"Privacy notice",robots:{index:false,follow:false}};

export default function PrivacyPage(){
  const identity=legalIdentity();
  const retention=process.env.DATA_RETENTION_DAYS||"90";
  const consumerRetention=process.env.CONSUMER_MEMORY_RETENTION_DAYS||"365";
  return <main className="seoPage"><div className="shell">
    <a className="eyebrow" href="/legal">← legal & commercial disclosure</a>
    <section className="seoHero" style={{marginTop:20}}>
      <div className="eyebrow">PRIVACY NOTICE · {LEGAL_DOCUMENT_VERSION}</div>
      <h1>Privacy notice.</h1>
      <p style={{fontSize:20,maxWidth:780}}>Atlas is designed to minimize personal data and to keep analytics consent separate from essential commercial attribution.</p>
    </section>
    <div className="seoGrid">
      <div className="card"><h2>Controller</h2>{identity.configured
        ?<p><b>{identity.operator}</b><br/>{identity.country}<br/><a href={"mailto:"+identity.email}>{identity.email}</a></p>
        :<p><b>Commercial launch gate incomplete.</b> The controller identity and contact email must be configured before commercial launch.</p>}</div>
      <div className="card"><h2>Data categories</h2><p>Depending on your choices and actions, Atlas may process pseudonymous visitor/session identifiers, consent state, attribution parameters, product events, saved-stay references, referral identifiers, booking/conversion evidence and operational hotel-contact data.</p></div>
      <div className="card"><h2>Purposes</h2><p>Operate the planner, preserve security, measure product usage where consent exists, attribute referrals, reconcile commissions, investigate incidents and maintain verified commercial inventory.</p></div>
      <div className="card"><h2>Retention</h2><p>Pseudonymous analytics/event retention is configured for approximately {retention} days. Anonymous saved-stay profiles expire after approximately {consumerRetention} days of inactivity and cascade-delete their saved references. Older attribution identifiers and raw conversion payloads are scrubbed by the retention workflow. Contract/accounting records may require a different lawful retention period before commercial launch.</p></div>
      <div className="card"><h2>Recipients and transfers</h2><p>Infrastructure and booking/referral providers may process data required to deliver their service. Atlas must maintain the final subprocessor/DPA and transfer record before commercial launch.</p></div>
      <div className="card"><h2>Your rights</h2><p>Where applicable and where data can be associated with you, rights may include access, correction, deletion, objection, restriction, portability and withdrawal of consent. From <a href="/saved">Saved</a> you can export the anonymous profile and saved-stay references associated with this browser as JSON, or use <b>Clear all saved memory</b> to remove local saved references, the server-side anonymous profile and its cookie. Analytics consent can be withdrawn below at any time. The operational contact above is the rights-request channel once configured.</p></div>
    </div>
    <div className="card" style={{marginTop:24}}><h2>Analytics choice</h2><p>Analytics is opt-in. Refusing analytics does not disable the deterministic planner. Essential security and referral evidence may still be processed when necessary to operate the requested commercial link or protect the service.</p></div>
    <ConsentSettings/>
  </div></main>;
}
