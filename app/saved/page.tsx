import type { Metadata } from "next";
import SavedStaysClient from "@/components/SavedStaysClient";
import SavedHotelsClient from "@/components/SavedHotelsClient";
import RateAlertsClient from "@/components/RateAlertsClient";

export const metadata:Metadata={title:"Saved stays",robots:{index:false,follow:false}};

export default function SavedStaysPage(){
  return <main className="seoPage"><div className="shell">
    <a href="/" className="eyebrow">← ATLAS LONG STAY</a>
    <section className="seoHero" style={{marginTop:20}}>
      <div className="eyebrow">YOUR SAVED STAYS</div>
      <h1>Compare the stays<br/>you would actually live in.</h1>
      <p style={{fontSize:20,maxWidth:760}}>Keep the places you like in one private shortlist. Prices are checked again when you open a stay.</p>
    </section>
    <RateAlertsClient/>
    <SavedHotelsClient/>
    <SavedStaysClient/>
  </div></main>;
}
