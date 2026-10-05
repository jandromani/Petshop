import type { Metadata } from "next";
import LiveOfferCard from "@/components/LiveOfferCard";
import { listSellableOffers } from "@/src/db/catalog";
import { canonicalSiteUrl } from "@/src/system/site-url";

export const dynamic="force-dynamic";

export async function generateMetadata():Promise<Metadata>{
  const base=canonicalSiteUrl();
  return{
    title:"Atlas Long Stay en español — vive temporadas, no escapadas",
    description:"Compara estancias de 30 a 365 días por coste mensual y construye un año flexible alrededor de un presupuesto real.",
    alternates:{canonical:base+"/es"},
    robots:{index:false,follow:true},
  };
}

export default async function SpanishHome(){
  const offers=await listSellableOffers({limit:6});
  return <main className="seoPage"><div className="shell">
    <a className="eyebrow" href="/">PREVIEW EN ESPAÑOL · ENGLISH ↗</a>
    <section className="seoHero" style={{marginTop:20}}>
      <div className="eyebrow">PREVIEW EN ESPAÑOL · 30–365 DÍAS</div>
      <h1>Vive en un sitio mejor.<br/>Quédate una temporada.</h1>
      <p style={{fontSize:20,maxWidth:780}}>Esta vista anticipa la experiencia en español. La búsqueda completa sigue en inglés mientras terminamos una traducción funcional de todo Atlas, no una landing distinta.</p>
      <div className="heroActions"><a className="btn" href="/">Abrir Atlas completo →</a><a className="btn ghost" href="/es/descubrir/menos-de-1500-al-mes">Explorar por presupuesto</a></div>
    </section>
    <div className="sectionTitle"><h2>Oferta verificada<br/>cuando existe.</h2><p>Si no hay inventario comercial vigente, Atlas no sustituye silenciosamente precios demo.</p></div>
    {offers.length?<div className="hotels">{offers.map((o,index)=><LiveOfferCard key={o.offerId} offer={o} href={"/api/referral?offer="+encodeURIComponent(o.offerId)+"&from=%2Fes&pos="+(index+1)}/>)}</div>
      :<div className="card"><b>PRECIOS VERIFICADOS AÚN NO DISPONIBLES</b><p>Los hoteles se pueden explorar y solicitar, pero un precio sólo aparecerá aquí cuando Atlas pueda verificarlo para una estancia real.</p></div>}
    <div className="heroActions" style={{marginTop:28}}>
      <a className="btn ghost" href="/es/descubrir/todo-incluido">Todo incluido</a>
      <a className="btn ghost" href="/es/descubrir/mejor-valor-asia">Asia</a>
      <a className="btn ghost" href="/legal">Privacidad y modelo comercial</a>
    </div>
  </div></main>;
}
