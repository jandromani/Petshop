import LiveOfferCard from "@/components/LiveOfferCard";
import { seoIntentEvidence,seoIntentPage,type SeoIntentKind } from "@/src/seo/intent-pages";
import { canonicalSiteUrl } from "@/src/system/site-url";
import { buildBreadcrumbStructuredData,buildDiscoveryItemListStructuredData } from "@/src/seo/structured-data";

export async function SeoIntentLanding({kind,slug}:{kind:SeoIntentKind;slug:string}){
  const page=seoIntentPage(kind,slug);if(!page)return null;
  const evidence=await seoIntentEvidence(page);
  const list=buildDiscoveryItemListStructuredData({title:page.title,canonical:evidence.canonical,offers:evidence.offers});
  const crumbs=buildBreadcrumbStructuredData([
    {name:"Atlas",url:canonicalSiteUrl()},
    {name:page.title,url:evidence.canonical},
  ]);
  return <main className="seoPage"><div className="shell">
    <a className="eyebrow" href="/destinations">← EXPLORE LONG STAYS</a>
    <section className="seoHero">
      <div className="eyebrow">LONG-STAY GUIDE · CURRENT DATA</div>
      <h1>{page.headline}</h1>
      <p style={{fontSize:20,maxWidth:800}}>{page.description}</p>
      <div className="destinationFacts"><span><b>{evidence.offers.length}</b> current offers</span><span><b>{new Set(evidence.offers.map(o=>o.hotelId)).size}</b> hotels</span><span><b>{new Set(evidence.offers.map(o=>o.country)).size}</b> countries</span></div>
    </section>
    {evidence.offers.length?<div className="hotels">{evidence.offers.slice(0,18).map((o,index)=><LiveOfferCard key={o.offerId} offer={o} detailHref={"/live/"+encodeURIComponent(o.slug)} href={"/api/referral?offer="+encodeURIComponent(o.offerId)+"&from="+encodeURIComponent(page.path)+"&pos="+(index+1)}/>)}</div>:<div className="card"><h2>No verified prices match this page yet.</h2><p>Atlas keeps this page out of search until enough current commercial evidence exists. You can still explore real hotels and request a rate.</p><a className="btn" href="/stays">Explore real hotels →</a></div>}
    <section className="methodologyMini"><h2>How Atlas builds this page</h2><p>Only current sellable offers count toward prices and availability. Expired evidence disappears, and pages without enough unique evidence stay out of the search index.</p><a href="/methodology">Read the methodology →</a></section>
    {list&&<script type="application/ld+json" dangerouslySetInnerHTML={{__html:JSON.stringify(list).replace(/</g,"\\u003c")}}/>}
    {crumbs&&<script type="application/ld+json" dangerouslySetInnerHTML={{__html:JSON.stringify(crumbs).replace(/</g,"\\u003c")}}/>}
  </div></main>;
}
