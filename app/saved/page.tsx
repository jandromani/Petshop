import type { Metadata } from "next";
import SavedStaysClient from "@/components/SavedStaysClient";

export const metadata:Metadata={title:"Saved stays",robots:{index:false,follow:false}};

export default function SavedStaysPage(){
  return <main className="seoPage"><div className="shell">
    <a href="/" className="eyebrow">← ATLAS LONG STAY</a>
    <section className="seoHero" style={{marginTop:20}}>
      <div className="eyebrow">SAVED · REVALIDATED</div>
      <h1>Compare the stays<br/>you would actually live in.</h1>
      <p style={{fontSize:20,maxWidth:760}}>Saved prices are never assumed current. Atlas re-checks each offer ID against the live catalogue and clearly marks anything that has expired.</p>
    </section>
    <SavedStaysClient/>
  </div></main>;
}
