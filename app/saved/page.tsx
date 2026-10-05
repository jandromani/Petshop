import type { Metadata } from "next";
import SavedStaysClient from "@/components/SavedStaysClient";
import SavedHotelsClient from "@/components/SavedHotelsClient";

export const metadata:Metadata={title:"Saved stays",robots:{index:false,follow:false}};

export default function SavedStaysPage(){
  return <main className="seoPage"><div className="shell">
    <a href="/" className="eyebrow">← ATLAS LONG STAY</a>
    <section className="seoHero" style={{marginTop:20}}>
      <div className="eyebrow">SAVED · REVALIDATED</div>
      <h1>Compare the stays<br/>you would actually live in.</h1>
      <p style={{fontSize:20,maxWidth:760}}>Save real hotels before a price exists, and save verified offers separately. Atlas never turns a property bookmark into a commercial claim.</p>
    </section>
    <SavedHotelsClient/>
    <SavedStaysClient/>
  </div></main>;
}
