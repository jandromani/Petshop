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
    alternates:{canonical:base+"/es",languages:{en:base,es:base+"/es"}},
    robots:{index:process.env.SEO_LIVE_INDEXING==="true",follow:true},
  };
}

export default async function SpanishHome(){
  const offers=await listSellableOffers({limit:6});
  return <main className="seoPage"><div className="shell">
    <a className="eyebrow" href="/">ATLAS LONG STAY · ENGLISH</a>
    <section className="seoHero" style={{marginTop:20}}>
      <div className="eyebrow">ESTANCIAS HOTELERAS · 30–365 DÍAS</div>
      <h1>Vive en un sitio mejor.<br/>Quédate una temporada.</h1>
      <p style={{fontSize:20,maxWidth:780}}>Atlas convierte pensión, ingresos de vivienda y ahorro mensual en un presupuesto claro para vivir por temporadas. El buscador completo está disponible en la experiencia principal y las ofertas comerciales sólo aparecen cuando están verificadas.</p>
      <div className="heroActions"><a className="btn" href="/#planner">Construir mi año →</a><a className="btn ghost" href="/es/descubrir/menos-de-1500-al-mes">Explorar por presupuesto</a></div>
    </section>
    <div className="sectionTitle"><h2>Oferta verificada<br/>cuando existe.</h2><p>Si no hay inventario comercial vigente, Atlas no sustituye silenciosamente precios demo.</p></div>
    {offers.length?<div className="hotels">{offers.map((o,index)=><LiveOfferCard key={o.offerId} offer={o} href={"/api/referral?offer="+encodeURIComponent(o.offerId)+"&from=%2Fes&pos="+(index+1)}/>)}</div>
      :<div className="card"><b>INVENTARIO LIVE AÚN NO ACTIVADO</b><p>La capa de producto está disponible; las ofertas aparecerán aquí sólo cuando pasen los gates de evidencia, vigencia y fulfillment.</p></div>}
    <div className="heroActions" style={{marginTop:28}}>
      <a className="btn ghost" href="/es/descubrir/todo-incluido">Todo incluido</a>
      <a className="btn ghost" href="/es/descubrir/mejor-valor-asia">Asia</a>
      <a className="btn ghost" href="/legal">Privacidad y modelo comercial</a>
    </div>
  </div></main>;
}
