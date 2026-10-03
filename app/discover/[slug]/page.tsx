import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { hotels } from "@/src/data/hotels";
import { DISCOVERY_PAGES,discoveryBySlug } from "@/src/seo/catalog";
import { liveDiscoveryEvidence } from "@/src/seo/live";

export const dynamic="force-dynamic";
const euro=(n:number,currency="EUR")=>new Intl.NumberFormat("en-US",{style:"currency",currency,maximumFractionDigits:0}).format(n);

export function generateStaticParams(){
  return DISCOVERY_PAGES.map(p=>({slug:p.slug}));
}

export async function generateMetadata({params}:{params:Promise<{slug:string}>}):Promise<Metadata>{
  const {slug}=await params;
  const result=await liveDiscoveryEvidence(slug);
  const page=result?.page||discoveryBySlug(slug);
  if(!page)return{};
  return{
    title:page.title,
    description:page.description,
    robots:{index:Boolean(result?.gate.index),follow:true},
    openGraph:{title:page.headline,description:page.description,type:"website"},
  };
}

export default async function Discovery({params}:{params:Promise<{slug:string}>}){
  const {slug}=await params;
  const live=await liveDiscoveryEvidence(slug);
  const page=live?.page||discoveryBySlug(slug);
  if(!page)notFound();

  const demo=[...hotels.filter(page.filter)].sort((a,b)=>(b.score/b.monthly)-(a.score/a.monthly)).slice(0,12);
  const offers=live?.offers||[];
  const indexed=Boolean(live?.gate.index);

  return <main className="seoPage"><div className="shell">
    <a href="/" className="eyebrow">← WORLD EXPLORER</a>
    <section className="seoHero" style={{marginTop:20}}>
      <div className="eyebrow">{page.intent.toUpperCase().replaceAll("-"," ")}</div>
      <h1 style={{marginTop:20}}>{page.headline}</h1>
      <p style={{fontSize:20,maxWidth:740}}>{page.description}</p>
      <p style={{fontSize:12,color:"#68738b"}}>
        {indexed
          ? "This page is indexable because every commercial card below comes from current truth-gated live inventory."
          : "Indexing is disabled. Live evidence is not yet sufficient for this intent; any fallback cards are clearly marked prototype scenarios."}
      </p>
    </section>

    {offers.length>0?<div className="hotels">
      {offers.slice(0,12).map((o,index)=><article className="hotel liveHotel" key={o.offerId}>
        <div className="hotelVisual"><span className="flag">✓</span><span className="score">LIVE {Math.round(o.confidence*100)}%</span></div>
        <div className="hotelBody">
          <h3>{o.city}</h3>
          <div className="loc">{o.country} · {o.name} · {o.provider}</div>
          <div className="chips"><span className="chip">{o.nights} nights</span>{o.board&&<span className="chip">{o.board}</span>}<span className="chip">{o.checkIn} → {o.checkOut}</span></div>
          <div className="priceRow">
            <div><b>{euro(o.monthlyEquivalent,o.currency)}</b><small>/30-day equivalent · total {euro(o.displayPrice,o.currency)}</small></div>
            <a className="linkbtn" href={"/api/referral?offer="+encodeURIComponent(o.offerId)+"&from="+encodeURIComponent("/discover/"+slug)+"&pos="+(index+1)}>Open verified offer →</a>
          </div>
        </div>
      </article>)}
    </div>:<div className="hotels">
      {demo.map(h=><article className="hotel" key={h.id}>
        <div className="hotelVisual"><span className="flag">{h.flag}</span><span className="score">DEMO · SILVER {h.score}</span></div>
        <div className="hotelBody">
          <h3>{h.city}</h3>
          <div className="loc">{h.country} · {h.name}</div>
          <div className="chips">{h.tags.slice(0,4).map(t=><span className="chip" key={t}>{t}</span>)}</div>
          <div className="priceRow"><div><b>{euro(h.monthly)}</b><small>/month prototype · {h.board}</small></div><a className="linkbtn" href={"/live/"+h.slug}>Scenario →</a></div>
        </div>
      </article>)}
    </div>}
  </div></main>;
}
