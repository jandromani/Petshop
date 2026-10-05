import type { Metadata } from "next";
import { notFound } from "next/navigation";
import RealHotelDirectory from "@/components/RealHotelDirectory";
import { publicDirectorySnapshot } from "@/src/data/public-directory";
import { destinationSeoBySlug,destinationSeoPages } from "@/src/seo/destinations";
import { canonicalSiteUrl } from "@/src/system/site-url";
import { destinationSeoEvidence } from "@/src/seo/live";
import { buildBreadcrumbStructuredData,buildDiscoveryItemListStructuredData } from "@/src/seo/structured-data";

export function generateStaticParams(){return destinationSeoPages.map(x=>({slug:x.slug}));}

export async function generateMetadata({params}:{params:Promise<{slug:string}>}):Promise<Metadata>{
  const {slug}=await params;const page=destinationSeoBySlug(slug);if(!page)return{};
  const evidence=await destinationSeoEvidence(page);
  const canonical=canonicalSiteUrl()+"/destinations/"+page.slug;
  const title="Long-Stay Hotels in "+page.market+" — Monthly & 30–90 Day Rates";
  const description="Explore long-stay hotels in "+page.market+", "+page.country+". Compare real properties and verified monthly hotel rates when current commercial evidence exists.";
  return{
    title,description,
    alternates:{canonical},
    robots:{index:evidence.gate.index,follow:true},
    openGraph:{title:title+" | Atlas",description,url:canonical,type:"website"},
    twitter:{card:"summary_large_image",title:title+" | Atlas",description},
  };
}

export default async function DestinationPage({params}:{params:Promise<{slug:string}>}){
  const {slug}=await params;const page=destinationSeoBySlug(slug);if(!page)notFound();
  const [initial,evidence]=await Promise.all([
    Promise.resolve(publicDirectorySnapshot(24,{q:page.market,region:page.region})),
    destinationSeoEvidence(page),
  ]);
  const canonical=canonicalSiteUrl()+"/destinations/"+page.slug;
  const itemList=buildDiscoveryItemListStructuredData({title:"Long-stay hotels in "+page.market,canonical,offers:evidence.offers});
  const breadcrumb=buildBreadcrumbStructuredData([
    {name:"Atlas",url:canonicalSiteUrl()},
    {name:"Destinations",url:canonicalSiteUrl()+"/destinations"},
    {name:page.market,url:canonical},
  ]);
  return <main className="seoPage destinationPage"><div className="shell">
    <a href="/destinations" className="eyebrow">← DESTINATIONS</a>
    <section className="seoHero destinationHero">
      <div className="eyebrow">LONG-STAY HOTELS · {page.country.toUpperCase()}</div>
      <h1>{page.market}<br/>long-stay hotels.</h1>
      <p>{page.hotels} real hotels are known in this destination set. Atlas only presents a monthly price as current when commercial evidence for the stay is still valid.</p>
      <div className="destinationFacts"><span><b>{page.mapped}</b> mapped</span><span><b>{evidence.offers.length}</b> verified rates now</span><span><b>{page.officialSites}</b> official sites</span></div>
      {page.topBrands.length?<p className="destinationBrands">Brands found here: {page.topBrands.join(" · ")}</p>:null}
      <div className="actions"><a className="btn" href={"/stays?q="+encodeURIComponent(page.market)}>Search {page.market} →</a><a className="btn ghost" href="/guides">Long-stay guides</a></div>
    </section>
    <RealHotelDirectory initialQuery={page.market} initialRegion={page.region} initialData={initial}/>
    <nav className="seoInternalLinks" aria-label="Related long-stay searches">
      <a href={"/long-stay/"+page.slug}>Long stays in {page.market}</a>
      <a href={"/monthly-hotels/"+page.slug}>Monthly hotels in {page.market}</a>
      <a href={"/90-day-stays/"+page.slug}>90-day stays in {page.market}</a>
    </nav>
    {itemList&&<script type="application/ld+json" dangerouslySetInnerHTML={{__html:JSON.stringify(itemList).replace(/</g,"\\u003c")}}/>}
    {breadcrumb&&<script type="application/ld+json" dangerouslySetInnerHTML={{__html:JSON.stringify(breadcrumb).replace(/</g,"\\u003c")}}/>}
  </div></main>;
}
