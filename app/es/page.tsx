import type { Metadata } from "next";
import LiveOfferCard from "@/components/LiveOfferCard";
import { listSellableOffers } from "@/src/db/catalog";
import { canonicalSiteUrl } from "@/src/system/site-url";

export const dynamic="force-dynamic";

export async function generateMetadata():Promise<Metadata>{
  const base=canonicalSiteUrl();
  return{
    title:"Atlas Long Stay en español — vive temporadas, no escapadas",
    description:"Compara estancias hoteleras de 30, 60 o 90 días por coste mensual y solicita una tarifa privada cuando no exista oferta verificada.",
    alternates:{canonical:base+"/es"},
    robots:{index:false,follow:true},
  };
}

export default async function SpanishHome(){
  const offers=await listSellableOffers({limit:6});
  return <main className="seoPage"><div className="shell">
    <a className="eyebrow" href="/">PREVIEW EN ESPAÑOL · ENGLISH ↗</a>
    <section className="seoHero" style={{marginTop:20}}>
      <div className="eyebrow">PREVIEW EN ESPAÑOL · 30–90 DÍAS</div>
      <h1>Vive en un sitio mejor.<br/>Quédate una temporada.</h1>
      <p style={{fontSize:20,maxWidth:780}}>Esta vista anticipa la experiencia en español. La búsqueda completa sigue en inglés mientras terminamos una traducción funcional de todo Atlas, no una landing distinta.</p>
      <div className="heroActions"><a className="btn" href="/stays?q=Tenerife&duration=60">Explorar Tenerife →</a><a className="btn ghost" href="/">Abrir Atlas completo</a></div>
    </section>
    <div className="sectionTitle"><h2>Oferta verificada<br/>cuando existe.</h2><p>Si no hay inventario comercial vigente, Atlas no sustituye silenciosamente precios demo.</p></div>
    {offers.length?<div className="hotels">{offers.map((o,index)=><LiveOfferCard key={o.offerId} offer={o} href={"/api/referral?offer="+encodeURIComponent(o.offerId)+"&from=%2Fes&pos="+(index+1)}/>)}</div>
      :<div className="card"><b>PRECIOS VERIFICADOS AÚN NO DISPONIBLES</b><p>Los hoteles se pueden explorar, pero un hotel encontrado no equivale a inventario contratado. Si no existe una tarifa verificada, Atlas puede abrir una solicitud privada de sourcing.</p></div>}
    <div className="heroActions" style={{marginTop:28}}>
      <a className="btn ghost" href="/stays?q=Gran%20Canaria&duration=60">Gran Canaria</a>
      <a className="btn ghost" href="/stay-readiness">Preparar estancia</a>
      <a className="btn ghost" href="/legal">Modelo comercial</a>
    </div>
  </div></main>;
}
