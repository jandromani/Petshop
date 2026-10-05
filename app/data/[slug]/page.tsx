import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { destinationSeoBySlug,destinationSeoPages } from "@/src/seo/destinations";
import { destinationSeoEvidence } from "@/src/seo/live";
import { canonicalSiteUrl } from "@/src/system/site-url";
import { buildBreadcrumbStructuredData,buildDatasetStructuredData } from "@/src/seo/structured-data";

export function generateStaticParams(){return destinationSeoPages.map(x=>({slug:x.slug}))}
const money=(n:number)=>new Intl.NumberFormat("en-US",{style:"currency",currency:"EUR",maximumFractionDigits:0}).format(n);

export async function generateMetadata({params}:{params:Promise<{slug:string}>}):Promise<Metadata>{
  const{slug}=await params;const page=destinationSeoBySlug(slug);if(!page)return{};
  const e=await destinationSeoEvidence(page);const canonical=canonicalSiteUrl()+"/data/"+page.slug;
  const title=page.market+" Long-Stay Hotel Price Index";
  const description="Verified long-stay hotel pricing data for "+page.market+", including sample size, monthly-equivalent range, freshness and Atlas methodology.";
  return{title,description,alternates:{canonical},robots:{index:e.gate.index,follow:true},openGraph:{title:title+" | Atlas",description,url:canonical,type:"article"},twitter:{card:"summary_large_image",title:title+" | Atlas",description}};
}

export default async function DataPage({params}:{params:Promise<{slug:string}>}){
  const{slug}=await params;const page=destinationSeoBySlug(slug);if(!page)notFound();
  const e=await destinationSeoEvidence(page);const values=e.offers.map(o=>o.monthlyEquivalent).sort((a,b)=>a-b);
  const median=values.length?values[Math.floor(values.length/2)]:null;const min=values[0]??null,max=values.at(-1)??null;
  const latest=e.offers.map(o=>new Date(o.verifiedAt).getTime()).filter(Number.isFinite).sort((a,b)=>b-a)[0];
  const updated=latest?new Date(latest).toISOString().slice(0,10):"2026-10-05";
  const canonical=canonicalSiteUrl()+"/data/"+page.slug;
  const dataset=buildDatasetStructuredData({name:page.market+" Long-Stay Hotel Price Index",description:"Verified monthly-equivalent long-stay hotel rates for "+page.market+".",canonical,dateModified:updated,spatial:page.market+", "+page.country,variables:["monthly equivalent price","stay length","occupancy","board","verification date"]});
  const crumbs=buildBreadcrumbStructuredData([{name:"Atlas",url:canonicalSiteUrl()},{name:"Data",url:canonicalSiteUrl()+"/data"},{name:page.market+" price index",url:canonical}]);
  return <main className="seoPage"><div className="shell"><a className="eyebrow" href="/data">← ATLAS DATA</a><section className="seoHero"><div className="eyebrow">UPDATED {updated}</div><h1>{page.market}<br/>long-stay hotel price index.</h1><p>Current commercial evidence normalized to a monthly equivalent. No prototype price is included in this dataset.</p></section>
  <section className="dataCitationCard"><div><span>Hotels in live sample</span><b>{new Set(e.offers.map(o=>o.hotelId)).size}</b></div><div><span>Verified offers</span><b>{e.offers.length}</b></div><div><span>Median / month</span><b>{median!==null?money(median):"—"}</b></div><div><span>Observed range</span><b>{min!==null&&max!==null?money(min)+"–"+money(max):"—"}</b></div><div><span>Last refresh</span><b>{latest?updated:"No live sample"}</b></div></section>
  <section className="editorialBody"><h2>Methodology</h2><p>Atlas uses only current sellable offers for this price index. The provider's total price remains unchanged; Atlas divides it by stay length and multiplies by 30 to create a comparable monthly equivalent. Expired rates are excluded.</p><h2>Sources and provenance</h2><p>Property identity and location are maintained separately from commercial rate evidence. A property may exist in Atlas without appearing in this price index until a current commercial offer is available.</p><p><a href="/methodology">Read the full methodology →</a></p></section>
  <nav className="seoInternalLinks"><a href={"/destinations/"+page.slug}>Hotels in {page.market}</a><a href={"/long-stay/"+page.slug}>Long stays in {page.market}</a><a href={"/90-day-stays/"+page.slug}>90-day stays</a></nav>
  <script type="application/ld+json" dangerouslySetInnerHTML={{__html:JSON.stringify(dataset).replace(/</g,"\\u003c")}}/>{crumbs&&<script type="application/ld+json" dangerouslySetInnerHTML={{__html:JSON.stringify(crumbs).replace(/</g,"\\u003c")}}/>}</div></main>;
}
