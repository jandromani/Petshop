import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { hotelBySlug } from "@/src/data/hotels";
import { evaluateSellability } from "@/src/core/truth";
import { listSellableOffers } from "@/src/db/catalog";
import { canonicalSiteUrl } from "@/src/system/site-url";
import { seoAutopilotEnabled } from "@/src/seo/live";
import LiveStructuredData from "@/components/LiveStructuredData";
import LiveOfferCard from "@/components/LiveOfferCard";

export const dynamic="force-dynamic";

async function liveOffers(slug:string){
  return listSellableOffers({slug,limit:12});
}

export async function generateMetadata({params}:{params:Promise<{slug:string}>}):Promise<Metadata>{
  const {slug}=await params;
  const live=await liveOffers(slug);
  const seed=hotelBySlug(slug);
  if(live.length){
    const first=live[0];
    const canonical=canonicalSiteUrl()+"/live/"+slug;
    return{
      title:first.city+" long stay · verified live offers",
      description:"Current truth-gated long-stay offers in "+first.city+", framed by monthly living cost.",
      alternates:{canonical},
      robots:{index:seoAutopilotEnabled(),follow:true},
      openGraph:{title:"Live in "+first.city+" for a season",description:"Verified long-stay inventory with current commercial paths.",type:"website"},
    };
  }
  if(!seed)return{};
  return{
    title:seed.city+" long stay · prototype scenario",
    description:"Explore a long-stay scenario in "+seed.city+". Commercial inventory is shown only after live verification.",
    robots:{index:false,follow:true},
  };
}

export default async function LifePage({params}:{params:Promise<{slug:string}>}){
  const {slug}=await params;
  const live=await liveOffers(slug);

  if(live.length){
    const first=live[0];
    const canonical=canonicalSiteUrl()+"/live/"+slug;
    return <main className="seoPage">
      <LiveStructuredData offers={live} canonical={canonical}/>
      <div className="shell">
        <a href="/" className="eyebrow">← Atlas stays</a>
        <section className="seoHero" style={{marginTop:20}}>
          <div className="eyebrow">LIVE · TRUTH-GATED</div>
          <h1>Live in {first.city}<br/>for a season.</h1>
          <p style={{fontSize:20,maxWidth:760}}>{first.name} · {first.country}. Every offer below has a current verified commercial path; no LLM-generated price is shown.</p>
        </section>
        <div className="hotels">
          {live.map((o,index)=><LiveOfferCard key={o.offerId} offer={o} href={"/api/referral?offer="+encodeURIComponent(o.offerId)+"&from="+encodeURIComponent("/live/"+slug)+"&pos="+(index+1)}/>)}
        </div>
      </div>
    </main>;
  }

  const h=hotelBySlug(slug);
  if(!h)notFound();
  const truth=evaluateSellability(h);
  return <main className="seoPage"><div className="shell">
    <a href="/" className="eyebrow">← Atlas stays</a>
    <section className="seoHero" style={{marginTop:20}}>
      <div style={{fontSize:48}}>{h.flag}</div>
      <h1>Live in {h.city}<br/>for a season.</h1>
      <p style={{fontSize:20,maxWidth:700}}>{h.name} · {h.board} · {h.climate}. This is a prototype life scenario, not a live hotel offer.</p>
    </section>
    <div className="seoGrid">
      <div className="card">
        <div className="eyebrow">NO VERIFIED COMMERCIAL RATE</div>
        <h2>No synthetic price is shown.</h2>
        <p>This seed record can support product testing, but Atlas will not turn it into a consumer price. Search the real hotel directory or create a private sourcing request for an identified property.</p>
        <div className="chips">{h.tags.map(t=><span className="chip" key={t}>{t}</span>)}</div>
        <a className="btn ghost" href={"/stays?q="+encodeURIComponent(h.city)+"&duration=60"}>Search real hotels in {h.city} →</a>
      </div>
      <div className="card">
        <div className="eyebrow">TRUTH RECORD</div>
        <h2>Silver Score {h.score}</h2>
        <p>Commercial state: <b>{truth.state}</b></p>
        <p>Commercial confidence: <b>{Math.round(truth.confidence*100)}%</b></p>
        <p>Reason: <b>{truth.reasons.join(", ")}</b></p>
        <p style={{color:"#68738b",fontSize:12}}>A live commercial CTA appears here only after provider or direct-contract evidence passes deterministic gates.</p>
      </div>
    </div>
  </div></main>;
}
