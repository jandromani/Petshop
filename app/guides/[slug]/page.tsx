import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { EDITORIAL_PAGES,editorialBySlug,editorialEvidence } from "@/src/seo/editorial";
import { canonicalSiteUrl } from "@/src/system/site-url";
import { buildArticleStructuredData,buildBreadcrumbStructuredData } from "@/src/seo/structured-data";

export function generateStaticParams(){return EDITORIAL_PAGES.map(x=>({slug:x.slug}))}
const money=(n:number)=>new Intl.NumberFormat("en-US",{style:"currency",currency:"EUR",maximumFractionDigits:0}).format(n);
function stats(offers:Array<{hotelId:string;monthlyEquivalent:number;verifiedAt:string}>){
  const values=offers.map(o=>o.monthlyEquivalent).filter(Number.isFinite).sort((a,b)=>a-b);
  const median=values.length?values[Math.floor(values.length/2)]:null;
  const latest=offers.map(o=>new Date(o.verifiedAt).getTime()).filter(Number.isFinite).sort((a,b)=>b-a)[0];
  return{hotels:new Set(offers.map(o=>o.hotelId)).size,offers:offers.length,median,min:values[0]??null,max:values.at(-1)??null,updated:latest?new Date(latest).toISOString().slice(0,10):null};
}

export async function generateMetadata({params}:{params:Promise<{slug:string}>}):Promise<Metadata>{
  const{slug}=await params;const page=editorialBySlug(slug);if(!page)return{};
  const evidence=await editorialEvidence(page);
  return{title:page.title,description:page.description,alternates:{canonical:evidence.canonical},robots:{index:evidence.gate.index,follow:true},openGraph:{title:page.title+" | Atlas",description:page.description,url:evidence.canonical,type:"article"},twitter:{card:"summary_large_image",title:page.title+" | Atlas",description:page.description}};
}

export default async function Guide({params}:{params:Promise<{slug:string}>}){
  const{slug}=await params;const page=editorialBySlug(slug);if(!page)notFound();
  const evidence=await editorialEvidence(page);const s=stats(evidence.offers);
  const modified=s.updated||"2026-10-05";
  const article=buildArticleStructuredData({headline:page.title,description:page.description,canonical:evidence.canonical,dateModified:modified});
  const crumbs=buildBreadcrumbStructuredData([{name:"Atlas",url:canonicalSiteUrl()},{name:"Guides",url:canonicalSiteUrl()+"/guides"},{name:page.title,url:evidence.canonical}]);
  return <main className="seoPage"><div className="shell"><a className="eyebrow" href="/guides">← LONG-STAY GUIDES</a><article>
    <header className="seoHero"><div className="eyebrow">{page.angle.toUpperCase()}</div><h1>{page.title}</h1><p>{page.description}</p></header>
    <section className="dataCitationCard"><div><span>Last verified refresh</span><b>{s.updated||"No live rate sample yet"}</b></div><div><span>Hotels analysed</span><b>{s.hotels}</b></div><div><span>Current offers</span><b>{s.offers}</b></div><div><span>Median / month</span><b>{s.median!==null?money(s.median):"—"}</b></div><div><span>Current range</span><b>{s.min!==null&&s.max!==null?money(s.min)+"–"+money(s.max):"—"}</b></div></section>
    <section className="editorialBody"><h2>What the current evidence says</h2>{s.offers?<p>Atlas currently has {s.offers} verified offer{s.offers===1?"":"s"} across {s.hotels} hotel{s.hotels===1?"":"s"} relevant to this guide. The median monthly equivalent is {money(s.median||0)}, with a current observed range of {money(s.min||0)} to {money(s.max||0)}. These are current evidence points, not a promise that the same price will remain available.</p>:<p>Atlas does not yet have enough fresh commercial evidence to publish a price conclusion for this guide. The page remains noindex until the sample clears the SEO gate.</p>}
    {page.questions.map(q=><section key={q}><h2>{q}</h2><p>Atlas answers this from current property and commercial evidence where available, while keeping unknown amenities, expired prices and unsupported claims out of the conclusion.</p></section>)}
    <h2>Methodology</h2><p>Monthly equivalents normalize a provider's real total stay price to 30 days for comparison. Atlas never converts a prototype price into a live offer, and expired commercial evidence is removed from indexable data pages.</p><p><a href="/methodology">Full methodology and data provenance →</a></p>
    </section>
    <nav className="seoInternalLinks"><a href="/destinations">Explore destinations</a><a href="/data">Atlas data indexes</a><a href="/stays">Search real hotels</a></nav>
  </article>
  <script type="application/ld+json" dangerouslySetInnerHTML={{__html:JSON.stringify(article).replace(/</g,"\\u003c")}}/>
  {crumbs&&<script type="application/ld+json" dangerouslySetInnerHTML={{__html:JSON.stringify(crumbs).replace(/</g,"\\u003c")}}/>}
  </div></main>;
}
