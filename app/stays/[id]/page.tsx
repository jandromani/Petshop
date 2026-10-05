import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { resolveDirectoryHotel } from "@/src/services/directory";
import { listSellableOffers } from "@/src/db/catalog";
import LiveOfferCard from "@/components/LiveOfferCard";
import { defaultCheckIn,type StayDuration } from "@/src/core/search";
import SourceStayForm from "@/components/SourceStayForm";
import SaveHotelButton from "@/components/SaveHotelButton";
import RateAlertForm from "@/components/RateAlertForm";

const allowed=new Set([30,60,90,120,180,365]);
function norm(s:string){return s.normalize("NFD").replace(/[\u0300-\u036f]/g,"").toLowerCase().replace(/[^a-z0-9]+/g," ").trim()}
function closeName(a:string,b:string){const x=norm(a),y=norm(b);return x===y||x.includes(y)||y.includes(x)}

export async function generateMetadata({params}:{params:Promise<{id:string}>}):Promise<Metadata>{
  const{id}=await params;const h=await resolveDirectoryHotel(id);
  return h?{title:h.name,description:h.description||h.name+" in "+h.city+", "+h.country+". Explore this real property for a 30–365 day stay; Atlas only publishes prices after live verification.",robots:{index:false,follow:true}}:{};
}

export default async function StayDetail({params,searchParams}:{params:Promise<{id:string}>;searchParams:Promise<{duration?:string;checkIn?:string;occupancy?:string}>}){
  const[{id},query]=await Promise.all([params,searchParams]);const hotel=await resolveDirectoryHotel(id);if(!hotel)notFound();
  const raw=Number(query.duration||90);const duration=(allowed.has(raw)?raw:90) as StayDuration;
  const checkIn=/^\d{4}-\d{2}-\d{2}$/.test(query.checkIn||"")?String(query.checkIn):defaultCheckIn();const occupancy=Number(query.occupancy)===2?2:1;
  const candidates=await listSellableOffers({q:hotel.name,nights:duration,checkIn,occupancy,flexibleDays:30,limit:12}).catch(()=>[]);
  const live=candidates.filter(o=>o.city.toLowerCase()===hotel.city.toLowerCase()&&closeName(o.name,hotel.name));
  const photos=(hotel.photoUrls||[]).slice(0,5);const facilities=(hotel.facilities||[]).slice(0,12);
  return <main className="seoPage"><div className="shell">
    <a href="/stays" className="eyebrow">← REAL HOTEL SEARCH</a>
    <section className="hotelDetailHero">
      <div className="hotelDetailCopy"><div className="eyebrow">REAL PROPERTY · {live.length?"VERIFIED RATE AVAILABLE":"RATE PENDING"}</div><h1>{hotel.name}</h1><p className="hotelDetailPlace">{hotel.address||hotel.city+", "+hotel.country}</p><p>{hotel.description||"Atlas has verified this property identity. Descriptive and commercial facts remain evidence-backed: unknown details stay unknown rather than being generated."}</p>
      <div className="chips">{facilities.map(x=><span className="chip" key={x}>✓ {x}</span>)}</div>
      <div className="actions">{hotel.website&&<a className="btn" href={hotel.website} target="_blank" rel="noreferrer">Official hotel site ↗</a>}<a className="btn ghost" href={hotel.referenceUrl||"#"} target="_blank" rel="noreferrer">Verify location ↗</a><SaveHotelButton hotel={{id:hotel.id,name:hotel.name,city:hotel.city,country:hotel.country,source:hotel.source}}/></div>
      <div className="hotelEvidence"><span><b>{hotel.source==="overture"?"Overture Maps":hotel.source}</b> identity source</span>{hotel.confidence!==null&&<span><b>{Math.round(hotel.confidence*100)}%</b> place confidence</span>}{hotel.lat!==null&&hotel.lng!==null&&<span><b>{hotel.lat.toFixed(3)}, {hotel.lng.toFixed(3)}</b> coordinates</span>}{hotel.contentProvider&&<span><b>{hotel.contentProvider.toUpperCase()}</b> licensed/display-authorized content</span>}</div></div>
      <div className="hotelDetailMedia">{photos.length?photos.map((src,i)=><img src={src} alt={i===0?hotel.name:"View of "+hotel.name} key={src} loading={i===0?"eager":"lazy"} referrerPolicy="no-referrer"/>):<div className="hotelDetailFallback"><span>{hotel.city}</span><small>{hotel.country}</small></div>}</div>
    </section>
    <RateAlertForm hotel={{id:hotel.id,name:hotel.name,city:hotel.city,country:hotel.country}} defaultCheckIn={checkIn} defaultDuration={duration}/>
    {live.length?<section className="discovery hotelDetailOffers"><div className="sectionTitle"><h2>Verified Atlas rates.</h2><p>Fresh commercial evidence for your requested {duration}-day stay. Price, board and cancellation come from the verified offer—not from the property identity.</p></div><div className="hotels">{live.map((o,index)=><LiveOfferCard key={o.offerId} offer={o} detailHref={"/live/"+encodeURIComponent(o.slug)} href={"/api/referral?offer="+encodeURIComponent(o.offerId)+"&from="+encodeURIComponent("/stays/"+id)+"&pos="+(index+1)}/>)}</div></section>:<div className="card ratePendingCard"><div className="eyebrow">RATE PENDING · {duration} DAYS</div><h2>Want Atlas to source this stay?</h2><p>The hotel is real; a long-stay commercial rate for your exact request is not verified yet. Sending a request routes demand into Direct Hotel OS without inventing availability.</p><SourceStayForm hotelId={hotel.id} defaultCheckIn={checkIn} defaultDuration={duration}/></div>}
    <div className="hotelServiceLinks"><a href="/services/insurance">Insurance →</a><a href="/services/telemedicine">Telemedicine →</a><a href="/services/transfer">Airport transfer →</a></div>
  </div></main>;
}