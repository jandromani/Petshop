import type { Metadata } from "next";
import { notFound } from "next/navigation";
import LiveOfferCard from "@/components/LiveOfferCard";
import { liveDiscoveryEvidence } from "@/src/seo/live";
import { ES_DISCOVERY,esDiscoveryBySlug } from "@/src/seo/es-catalog";
import { canonicalSiteUrl } from "@/src/system/site-url";

export const dynamic="force-dynamic";

export function generateStaticParams(){
  return ES_DISCOVERY.map(x=>({slug:x.slug}));
}

export async function generateMetadata({params}:{params:Promise<{slug:string}>}):Promise<Metadata>{
  const {slug}=await params;
  const page=esDiscoveryBySlug(slug);
  if(!page)return{};
  const result=await liveDiscoveryEvidence(page.sourceSlug);
  const base=canonicalSiteUrl();
  return{
    title:page.title,
    description:page.description,
    alternates:{
      canonical:base+"/es/descubrir/"+page.slug,
      languages:{en:base+"/discover/"+page.sourceSlug,es:base+"/es/descubrir/"+page.slug},
    },
    robots:{index:Boolean(result?.gate.index),follow:true},
    openGraph:{title:page.headline,description:page.description,type:"website"},
  };
}

export default async function SpanishDiscovery({params}:{params:Promise<{slug:string}>}){
  const {slug}=await params;
  const page=esDiscoveryBySlug(slug);
  if(!page)notFound();
  const result=await liveDiscoveryEvidence(page.sourceSlug);
  const offers=result?.offers||[];
  const indexed=Boolean(result?.gate.index);
  const canonical=canonicalSiteUrl()+"/es/descubrir/"+page.slug;
  const jsonLd=offers.length?{
    "@context":"https://schema.org",
    "@type":"ItemList",
    name:page.title,
    url:canonical,
    numberOfItems:offers.length,
    itemListElement:offers.slice(0,12).map((o,index)=>({
      "@type":"ListItem",position:index+1,
      item:{
        "@type":"Hotel",name:o.name,
        address:{"@type":"PostalAddress",addressLocality:o.city,addressCountry:o.country},
        offers:{"@type":"Offer",price:o.displayPrice,priceCurrency:o.currency,url:canonical},
      },
    })),
  }:null;

  return <main className="seoPage">{jsonLd&&<script type="application/ld+json" dangerouslySetInnerHTML={{__html:JSON.stringify(jsonLd)}}/>}<div className="shell">
    <a href="/es" className="eyebrow">← ATLAS EN ESPAÑOL</a>
    <section className="seoHero" style={{marginTop:20}}>
      <div className="eyebrow">LARGA ESTANCIA · INVENTARIO LIVE</div>
      <h1>{page.headline}</h1>
      <p style={{fontSize:20,maxWidth:760}}>{page.description}</p>
      <p style={{fontSize:12,color:"#68738b"}}>{indexed
        ?"Esta página puede indexarse porque sus ofertas proceden de inventario comercial vigente y verificado."
        :"La indexación permanece desactivada hasta que exista suficiente evidencia comercial live para esta intención."}</p>
    </section>
    {offers.length?<div className="hotels">{offers.slice(0,12).map((o,index)=><LiveOfferCard key={o.offerId} offer={o} href={"/api/referral?offer="+encodeURIComponent(o.offerId)+"&from="+encodeURIComponent("/es/descubrir/"+slug)+"&pos="+(index+1)}/>)}</div>
      :<div className="card"><b>SIN OFERTAS LIVE PARA ESTA INTENCIÓN</b><p>No mostramos precios demo como si fueran inventario reservable. Prueba el planificador mientras se activa supply comercial.</p><a className="btn ghost" href="/#planner">Abrir planificador →</a></div>}
  </div></main>;
}
