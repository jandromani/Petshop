import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { hotelBySlug } from "@/src/data/hotels";
import { evaluateSellability } from "@/src/core/truth";
import { listSellableOffers } from "@/src/db/catalog";
import { requestLanguage } from "@/src/i18n/server";
import { copy,localizedHref } from "@/src/i18n/config";
import { localizedMetadata } from "@/src/seo/public";
import { canonicalSiteUrl } from "@/src/system/site-url";
import { seoAutopilotEnabled } from "@/src/seo/live";
import LiveStructuredData from "@/components/LiveStructuredData";
import LiveOfferCard from "@/components/LiveOfferCard";

export const dynamic="force-dynamic";

async function liveOffers(slug:string){
  return listSellableOffers({slug,limit:12});
}

export async function generateMetadata({params}:{params:Promise<{slug:string}>}):Promise<Metadata>{
  const {slug}=await params;const language=await requestLanguage();const offers=await liveOffers(slug);const hotel=offers[0]||hotelBySlug(slug);if(!hotel)return{};
  return localizedMetadata("/live/"+slug,language,hotel.city+copy(language," long stay"," · larga estancia"),copy(language,"Explore stays in ","Explora estancias en ")+hotel.city+copy(language,". Prices and availability appear only after verification.",". Los precios y la disponibilidad se muestran tras su comprobación."),Boolean(offers.length&&seoAutopilotEnabled()));
}

export default async function LifePage({params}:{params:Promise<{slug:string}>}){
  const {slug}=await params;
  const language=await requestLanguage();const t=(en:string,es:string)=>copy(language,en,es),local=(path:string)=>localizedHref(path,language);
  const live=await liveOffers(slug);

  if(live.length){
    const first=live[0];
    const canonical=canonicalSiteUrl()+local("/live/"+slug);
    return <main className="seoPage">
      <LiveStructuredData offers={live} canonical={canonical}/>
      <div className="shell">
        <a href={local("/")} className="eyebrow">{t("← Atlas stays","← Estancias Atlas")}</a>
        <section className="seoHero" style={{marginTop:20}}>
          <div className="eyebrow">{t("CURRENT STAY OPTIONS","OPCIONES DE ESTANCIA VIGENTES")}</div>
          <h1>{t("Live in","Vive en")} {first.city}<br/>{t("for a season.","una temporada.")}</h1>
          <p style={{fontSize:20,maxWidth:760}}>{first.name} · {first.country}. {t("Review current rates, dates and booking conditions below.","Consulta las tarifas vigentes, las fechas y las condiciones de reserva.")}</p>
        </section>
        <div className="hotels">
          {live.map((o,index)=><LiveOfferCard key={o.offerId} offer={o} language={language} href={"/api/referral?offer="+encodeURIComponent(o.offerId)+"&from="+encodeURIComponent("/live/"+slug)+"&pos="+(index+1)}/>)}
        </div>
      </div>
    </main>;
  }

  const h=hotelBySlug(slug);
  if(!h)notFound();
  const truth=evaluateSellability(h);
  return <main className="seoPage"><div className="shell">
    <a href={local("/")} className="eyebrow">{t("← Atlas stays","← Estancias Atlas")}</a>
    <section className="seoHero" style={{marginTop:20}}>
      <div style={{fontSize:48}}>{h.flag}</div>
      <h1>{t("Live in","Vive en")} {h.city}<br/>{t("for a season.","una temporada.")}</h1>
      <p style={{fontSize:20,maxWidth:700}}>{h.name} · {h.board} · {h.climate}. {t("This is an illustrative stay scenario. No current rate or availability is confirmed.","Este es un ejemplo de estancia. No hay una tarifa ni disponibilidad vigente confirmada.")}</p>
    </section>
    <div className="seoGrid">
      <div className="card">
        <div className="eyebrow">{t("NO VERIFIED COMMERCIAL RATE","TARIFA PENDIENTE DE CONFIRMACIÓN")}</div>
        <h2>{t("No synthetic price is shown.","Consulta hoteles reales para tus fechas.")}</h2>
        <p>{t("This seed record can support product testing, but Atlas will not turn it into a consumer price. Search the real hotel directory or create a private sourcing request for an identified property.","Busca hoteles reales en el directorio y solicita una tarifa para el hotel que elijas.")}</p>
        <div className="chips">{h.tags.map(t=><span className="chip" key={t}>{t}</span>)}</div>
        <a className="btn ghost" href={local("/stays")+"?q="+encodeURIComponent(h.city)+"&duration=60"}>{t("Search real hotels in","Busca hoteles reales en")} {h.city} →</a>
      </div>
      <div className="card">
        <div className="eyebrow">{t("TRUTH RECORD","ESTADO DE LA OPCIÓN")}</div>
        <h2>Silver Score {h.score}</h2>
        <p>Commercial state: <b>{truth.state}</b></p>
        <p>Commercial confidence: <b>{Math.round(truth.confidence*100)}%</b></p>
        <p>Reason: <b>{truth.reasons.join(", ")}</b></p>
        <p style={{color:"#68738b",fontSize:12}}>{t("A live commercial CTA appears here only after provider or direct-contract evidence passes deterministic gates.","Las opciones de reserva aparecen cuando se comprueban las tarifas y condiciones del proveedor o del hotel.")}</p>
      </div>
    </div>
  </div></main>;
}
