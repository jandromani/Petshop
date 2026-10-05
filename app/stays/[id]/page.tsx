import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { resolveDirectoryHotel } from "@/src/services/directory";
import { listSellableOffers } from "@/src/db/catalog";
import LiveOfferCard from "@/components/LiveOfferCard";
import { defaultCheckIn,type StayDuration } from "@/src/core/search";
import SourceStayForm from "@/components/SourceStayForm";
import SaveHotelButton from "@/components/SaveHotelButton";
import RateAlertForm from "@/components/RateAlertForm";
import { hotelSeoEvidence } from "@/src/seo/hotel";
import { canonicalSiteUrl } from "@/src/system/site-url";
import { buildBreadcrumbStructuredData,buildLiveHotelStructuredData } from "@/src/seo/structured-data";

const allowed=new Set([30,60,90,120,180,365]);
function norm(s:string){return s.normalize("NFD").replace(/[\u0300-\u036f]/g,"").toLowerCase().replace(/[^a-z0-9]+/g," ").trim()}
function closeName(a:string,b:string){const x=norm(a),y=norm(b);return x===y||x.includes(y)||y.includes(x)}

export async function generateMetadata({params}:{params:Promise<{id:string}>}):Promise<Metadata>{
  const{id}=await params;const h=await resolveDirectoryHotel(id);if(!h)return{};
  const seo=await hotelSeoEvidence(h);
  const title=h.name+" Long Stay — Monthly & 30–365 Day Rates";
  const description=h.description||h.name+" in "+h.city+", "+h.country+". Explore it for a 30–365 day stay and request a verified long-stay price.";
  return{title,description,alternates:{canonical:seo.canonical},robots:{index:seo.index,follow:true},openGraph:{title:title+" | Atlas",description,url:seo.canonical,type:"website"},twitter:{card:"summary_large_image",title:title+" | Atlas",description}};
}

export default async function StayDetail({params,searchParams}:{params:Promise<{id:string}>;searchParams:Promise<{duration?:string;checkIn?:string;occupancy?:string}>}){
  const[{id},query]=await Promise.all([params,searchParams]);const hotel=await resolveDirectoryHotel(id);if(!hotel)notFound();
  const raw=Number(query.duration||90);const duration=(allowed.has(raw)?raw:90) as StayDuration;
  const checkIn=/^\d{4}-\d{2}-\d{2}$/.test(query.checkIn||"")?String(query.checkIn):defaultCheckIn();const occupancy=Number(query.occupancy)===2?2:1;
  const candidates=await listSellableOffers({q:hotel.name,nights:duration,checkIn,occupancy,flexibleDays:30,limit:12}).catch(()=>[]);
  const live=candidates.filter(o=>o.city.toLowerCase()===hotel.city.toLowerCase()&&closeName(o.name,hotel.name));
  const photos=(hotel.photoUrls||[]).slice(0,5);const facilities=(hotel.facilities||[]).slice(0,12);
  const seo=await hotelSeoEvidence(hotel);
  const hotelSchema=seo.index?buildLiveHotelStructuredData(seo.offers,seo.canonical):null;
  const breadcrumb=buildBreadcrumbStructuredData([{name:"Atlas",url:canonicalSiteUrl()},{name:"Stays",url:canonicalSiteUrl()+"/stays"},{name:hotel.name,url:seo.canonical}]);
  return <main className="seoPage consumerStayDetail"><div className="shell">
    <a href="/stays" className="backLink">← Back to stays</a>
    <section className="hotelDetailHero">
      <div className="hotelDetailCopy">
        <div className="eyebrow">{live.length?"AVAILABLE NOW":"REAL HOTEL · PRICE ON REQUEST"}</div>
        <h1>{hotel.name}</h1>
        <p className="hotelDetailPlace">{hotel.address||hotel.city+", "+hotel.country}</p>
        <p>{hotel.description||"A real hotel in "+hotel.city+". Atlas only shows a price when we can verify it for your dates."}</p>
        {facilities.length?<div className="chips">{facilities.map(x=><span className="chip" key={x}>✓ {x}</span>)}</div>:null}
        <div className="actions">{hotel.website&&<a className="btn ghost" href={hotel.website} target="_blank" rel="noreferrer">Official hotel site ↗</a>}<SaveHotelButton hotel={{id:hotel.id,name:hotel.name,city:hotel.city,country:hotel.country,source:hotel.source}}/></div>
        <details className="trustDetails"><summary>Why you can trust this listing</summary><div className="hotelEvidence"><span><b>✓ Real hotel</b>property identity checked</span>{hotel.lat!==null&&hotel.lng!==null&&<span><b>✓ Location mapped</b>coordinates available</span>}{hotel.contentProvider&&<span><b>✓ Display rights recorded</b>content source tracked</span>}<span><b>Price rule</b>no price appears without current evidence</span></div>{hotel.referenceUrl&&<a className="secondaryLink" href={hotel.referenceUrl} target="_blank" rel="noreferrer">Check location source ↗</a>}</details>
      </div>
      <div className="hotelDetailMedia">{photos.length?photos.map((src,i)=><img src={src} alt={i===0?hotel.name:"View of "+hotel.name} key={src} loading={i===0?"eager":"lazy"} referrerPolicy="no-referrer"/>):<div className="hotelDetailFallback travelFallback"><span>{hotel.city}</span><small>{hotel.country}</small><em>{duration} days could start here.</em></div>}</div>
    </section>
    {live.length?<section className="discovery hotelDetailOffers"><div className="sectionTitle"><h2>Available for your stay.</h2><p>These prices have current commercial evidence for your requested dates.</p></div><div className="hotels">{live.map((o,index)=><LiveOfferCard key={o.offerId} offer={o} detailHref={"/live/"+encodeURIComponent(o.slug)} href={"/api/referral?offer="+encodeURIComponent(o.offerId)+"&from="+encodeURIComponent("/stays/"+id)+"&pos="+(index+1)}/>)}</div></section>:<div className="card ratePendingCard"><div className="eyebrow">PRICE ON REQUEST · {duration} DAYS</div><h2>Want a long-stay price for {hotel.name}?</h2><p>Tell us the dates and budget you have in mind. We’ll record the request and look for a verified rate.</p><SourceStayForm hotelId={hotel.id} defaultCheckIn={checkIn} defaultDuration={duration}/></div>}
    {seo.offers.length>0&&<section className="hotelCurrentEvidence"><div className="sectionTitle"><h2>Other current verified stay options.</h2><p>These offers keep the hotel’s long-stay pricing evidence current even when they do not match the exact dates above.</p></div><div className="hotels">{seo.offers.slice(0,3).filter(o=>!live.some(x=>x.offerId===o.offerId)).map((o,index)=><LiveOfferCard key={o.offerId} offer={o} href={"/api/referral?offer="+encodeURIComponent(o.offerId)+"&from="+encodeURIComponent("/stays/"+id)+"&pos="+(index+1)}/>)}</div></section>}
    <RateAlertForm hotel={{id:hotel.id,name:hotel.name,city:hotel.city,country:hotel.country}} defaultCheckIn={checkIn} defaultDuration={duration}/>
    <div className="hotelServiceLinks"><a href="/services/insurance">Insurance →</a><a href="/services/telemedicine">Telemedicine →</a><a href="/services/transfer">Airport transfer →</a></div>
    {hotelSchema&&<script type="application/ld+json" dangerouslySetInnerHTML={{__html:JSON.stringify(hotelSchema).replace(/</g,"\\u003c")}}/>}
    {breadcrumb&&<script type="application/ld+json" dangerouslySetInnerHTML={{__html:JSON.stringify(breadcrumb).replace(/</g,"\\u003c")}}/>}
  </div></main>;
}