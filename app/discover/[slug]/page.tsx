import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { hotels } from "@/src/data/hotels";
import { DISCOVERY_PAGES,discoveryBySlug } from "@/src/seo/catalog";
import { liveDiscoveryEvidence } from "@/src/seo/live";
import { canonicalSiteUrl } from "@/src/system/site-url";
import LiveOfferCard from "@/components/LiveOfferCard";
import { esSlugForSource } from "@/src/seo/es-catalog";
import { buildDiscoveryItemListStructuredData } from "@/src/seo/structured-data";

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
  const base=canonicalSiteUrl();
  const canonical=base+"/discover/"+slug;
  const esSlug=esSlugForSource(slug);
  return{
    title:page.title,
    description:page.description,
    alternates:{canonical,languages:esSlug?{en:canonical,es:base+"/es/descubrir/"+esSlug,"x-default":canonical}:{en:canonical,"x-default":canonical}},
    robots:{index:Boolean(result?.gate.index),follow:true},
    openGraph:{title:page.title+" | Atlas",description:page.description,url:canonical,type:"website"},twitter:{card:"summary_large_image",title:page.title+" | Atlas",description:page.description},
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

  const canonical=canonicalSiteUrl()+"/discover/"+slug;
  const jsonLd=buildDiscoveryItemListStructuredData({title:page.title,canonical,offers});
  return <main className="seoPage">{jsonLd&&<script type="application/ld+json" dangerouslySetInnerHTML={{__html:JSON.stringify(jsonLd)}}/>}<div className="shell">
    <a href="/" className="eyebrow">← WORLD EXPLORER</a>
    <section className="seoHero" style={{marginTop:20}}>
      <div className="eyebrow">{page.intent.toUpperCase().replaceAll("-"," ")}</div>
      <h1 style={{marginTop:20}}>{page.headline}</h1>
      <p style={{fontSize:20,maxWidth:740}}>{page.description}</p>
      <p style={{fontSize:12,color:"#68738b"}}>
        {indexed
          ? "Current verified long-stay offers support this guide."
          : "This guide stays out of search until enough current long-stay price evidence exists."}
      </p>
    </section>

    {offers.length>0?<div className="hotels">
      {offers.slice(0,12).map((o,index)=><LiveOfferCard key={o.offerId} offer={o} detailHref={"/live/"+encodeURIComponent(o.slug)} href={"/api/referral?offer="+encodeURIComponent(o.offerId)+"&from="+encodeURIComponent("/discover/"+slug)+"&pos="+(index+1)}/>)}
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
