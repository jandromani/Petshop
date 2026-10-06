import { requestLanguage } from "@/src/i18n/server";
import { copy,localizedHref } from "@/src/i18n/config";
import type { Metadata } from "next";
import SavedStaysClient from "@/components/SavedStaysClient";
import SavedHotelsClient from "@/components/SavedHotelsClient";
import RateAlertsClient from "@/components/RateAlertsClient";

export const metadata:Metadata={title:"Saved stays",robots:{index:false,follow:false}};

export default async function SavedStaysPage(){
  const lang=await requestLanguage();const t=(en:string,es:string)=>copy(lang,en,es);
  return <main className="seoPage"><div className="shell">
    <a href={localizedHref("/",lang)} className="eyebrow">← ATLAS LONG STAY</a>
    <section className="seoHero" style={{marginTop:20}}>
      <div className="eyebrow">{t("YOUR SAVED STAYS","TUS ESTANCIAS GUARDADAS")}</div>
      <h1>{t("Compare the stays you would live in.","Compara los lugares donde pasarías una temporada.")}</h1>
      <p style={{fontSize:20,maxWidth:760}}>{t("Keep your favourite hotels in a private shortlist. Prices are checked again when you open a stay.","Guarda tus hoteles favoritos en una lista privada. Los precios se comprueban al abrir una estancia.")}</p>
    </section>
    <RateAlertsClient/>
    <SavedHotelsClient/>
    <SavedStaysClient/>
  </div></main>;
}
