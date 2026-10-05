import type { Metadata } from "next";
import { notFound } from "next/navigation";
import RealHotelDirectory from "@/components/RealHotelDirectory";
import { publicDirectorySnapshot } from "@/src/data/public-directory";
import { destinationSeoBySlug,destinationSeoPages } from "@/src/seo/destinations";
import { canonicalSiteUrl,publicSiteConfigured } from "@/src/system/site-url";
import { seoAutopilotEnabled } from "@/src/seo/live";

export function generateStaticParams(){return destinationSeoPages.map(x=>({slug:x.slug}));}

export async function generateMetadata({params}:{params:Promise<{slug:string}>}):Promise<Metadata>{
  const {slug}=await params;const page=destinationSeoBySlug(slug);if(!page)return{};
  const canIndex=publicSiteConfigured()&&seoAutopilotEnabled()&&page.indexable;
  const canonical=canonicalSiteUrl()+"/destinations/"+page.slug;
  return{
    title:page.market+" long-stay hotels",
    description:"Browse "+page.hotels+" real hotel identities around "+page.market+", "+page.country+". "+page.mapped+" are mapped; prices appear only when Atlas has verified a commercial rate.",
    alternates:{canonical},
    robots:{index:canIndex,follow:true},
    openGraph:{title:page.market+" long-stay hotels",description:"Real mapped hotels for 30–365 day stays in "+page.market+".",url:canonical,type:"website"},
  };
}

export default async function DestinationPage({params}:{params:Promise<{slug:string}>}){
  const {slug}=await params;const page=destinationSeoBySlug(slug);if(!page)notFound();
  const initial=publicDirectorySnapshot(24,{q:page.market,region:page.region});
  const canonical=canonicalSiteUrl()+"/destinations/"+page.slug;
  const structured={
    "@context":"https://schema.org","@type":"ItemList",name:"Long-stay hotels in "+page.market,
    url:canonical,numberOfItems:initial.total,
    itemListElement:initial.hotels.slice(0,12).map((h:any,index:number)=>({
      "@type":"ListItem",position:index+1,item:{"@type":"Hotel",name:h.name,url:canonical+"#hotel-"+h.id,
        address:{"@type":"PostalAddress",addressLocality:h.city,addressCountry:h.country}}
    })),
  };
  return <main className="seoPage destinationPage"><div className="shell">
    <a href="/stays" className="eyebrow">← REAL HOTEL SEARCH</a>
    <section className="seoHero destinationHero">
      <div className="eyebrow">REAL PROPERTY DIRECTORY · {page.country.toUpperCase()}</div>
      <h1>{page.market}<br/>long-stay hotels.</h1>
      <p>{page.hotels} real hotel identities in this destination set; {page.mapped} have map coordinates and {page.officialSites} have an official website in the current evidence snapshot. Atlas does not invent availability or monthly rates.</p>
      <div className="destinationFacts"><span><b>{page.mapped}</b> mapped</span><span><b>{page.branded}</b> with known brand</span><span><b>{page.officialSites}</b> official sites</span></div>
      {page.topBrands.length?<p className="destinationBrands">Known brands in the data: {page.topBrands.join(" · ")}</p>:null}
    </section>
    <RealHotelDirectory initialQuery={page.market} initialRegion={page.region} initialData={initial}/>
    <script type="application/ld+json" dangerouslySetInnerHTML={{__html:JSON.stringify(structured).replace(/</g,"\\u003c")}}/>
  </div></main>;
}
