import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { hotelBySlug } from "@/src/data/hotels";
import { evaluateSellability } from "@/src/core/truth";
import { listSellableOffers } from "@/src/db/catalog";
import { canonicalSiteUrl } from "@/src/system/site-url";
import LiveStructuredData from "@/components/LiveStructuredData";

export const dynamic="force-dynamic";
const money=(n:number,currency:string)=>new Intl.NumberFormat("en-US",{style:"currency",currency,maximumFractionDigits:0}).format(n);

async function liveOffers(slug:string){
  return listSellableOffers({slug,limit:12});
}

export async function generateMetadata({params}:{params:Promise<{slug:string}>}):Promise<Metadata>{
  const {slug}=await params;
  const live=await liveOffers(slug);
  const seed=hotelBySlug(slug);
  if(live.length){
    const first=live[0];
    const index=process.env.SEO_LIVE_INDEXING==="true";
    const canonical=canonicalSiteUrl()+"/live/"+slug;
    return{
      title:first.city+" long stay · verified live offers",
      description:"Current truth-gated long-stay offers in "+first.city+", framed by monthly living cost.",
      alternates:{canonical},
      robots:{index,follow:true},
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
    return <main className="seoPage"><LiveStructuredData offers={live} canonical={canonical}/><div className="shell">
      <a href="/" className="eyebrow">← Atlas world explorer</a>
      <section className="seoHero" style={{marginTop:20}}>
        <div className="eyebrow">LIVE · TRUTH-GATED</div>
        <h1>Live in {first.city}<br/>for a season.</h1>
        <p style={{fontSize:20,maxWidth:760}}>{first.name} · {first.country}. Every offer below has a current verified commercial path; no LLM-generated price is shown.</p>
      </section>
      <div className="hotels">
        {live.map((o,index)=><article className="hotel liveHotel" key={o.offerId}>
          <div className="hotelVisual"><span className="flag">✓</span><span className="score">LIVE {Math.round(o.confidence*100)}%</span></div>
          <div className="hotelBody">
            <h3>{o.name}</h3>
            <div className="loc">{o.city}, {o.country} · {o.provider}</div>
            <div className="chips"><span className="chip">{o.nights} nights</span><span className="chip">{o.occupancy} adult{o.occupancy===1?"":"s"}</span>{o.board&&<span className="chip">{o.board}</span>}</div>
            <div className="priceRow">
              <div><b>{money(o.monthlyEquivalent,o.currency)}</b><small>/30-day equivalent · total {money(o.displayPrice,o.currency)}</small></div>
              <a className="linkbtn" href={"/api/referral?offer="+encodeURIComponent(o.offerId)+"&from="+encodeURIComponent("/live/"+slug)+"&pos="+(index+1)}>Open verified offer →</a>
            </div>
          </div>
        </article>)}
      </div>
    </div></main>;
  }

  const h=hotelBySlug(slug);
  if(!h)notFound();
  const truth=evaluateSellability(h);
  return <main className="seoPage"><div className="shell">
    <a href="/" className="eyebrow">← Atlas world explorer</a>
    <section className="seoHero" style={{marginTop:20}}>
      <div style={{fontSize:48}}>{h.flag}</div>
      <h1>Live in {h.city}<br/>for a season.</h1>
      <p style={{fontSize:20,maxWidth:700}}>{h.name} · {h.board} · {h.climate}. This is a prototype life scenario, not a live hotel offer.</p>
    </section>
    <div className="seoGrid">
      <div className="card">
        <div className="eyebrow">DEMO ECONOMICS · NOINDEX</div>
        <h2 style={{fontSize:46,letterSpacing:"-.05em",marginBottom:8}}>€{h.monthly.toLocaleString("en-US")}<small style={{fontSize:14,color:"#68738b"}}>/month seed</small></h2>
        <p>30 days: €{h.monthly.toLocaleString("en-US")} · 60 days: €{(h.monthly*2).toLocaleString("en-US")} · 90 days: €{(h.monthly*3).toLocaleString("en-US")}</p>
        <div className="chips">{h.tags.map(t=><span className="chip" key={t}>{t}</span>)}</div>
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
