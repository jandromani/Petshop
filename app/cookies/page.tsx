import type { Metadata } from "next";

export const metadata:Metadata={title:"Cookies & analytics",robots:{index:false,follow:false}};

export default function CookiesPage(){
  return <main className="seoPage"><div className="shell">
    <a className="eyebrow" href="/legal">← legal & commercial disclosure</a>
    <section className="seoHero" style={{marginTop:20}}>
      <div className="eyebrow">COOKIES + ANALYTICS</div>
      <h1>Cookies and analytics.</h1>
      <p style={{fontSize:20,maxWidth:780}}>Atlas separates essential operation from optional analytics.</p>
    </section>
    <div className="seoGrid">
      <div className="card"><h2>Essential</h2><p>Security/session state required to operate protected product surfaces may be used without enabling optional analytics.</p></div>
      <div className="card"><h2>Analytics consent</h2><p>Persistent Atlas visitor/session analytics identifiers, campaign attribution cookies, Vercel Analytics and Speed Insights are only activated after the analytics consent state is selected.</p></div>
      <div className="card"><h2>Commercial referrals</h2><p>When you deliberately follow a commercial referral, Atlas may create a referral identifier so a later conversion can be reconciled. This is distinct from general behavioural analytics.</p></div>
      <div className="card"><h2>Withdrawal</h2><p>Changing the consent choice to essential-only causes Atlas to remove its optional tracking cookies on the next matching request.</p></div>
    </div>
  </div></main>;
}
