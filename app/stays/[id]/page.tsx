import { notFound } from "next/navigation";
import { resolveDirectoryHotel } from "@/src/services/directory";
import { listSellableOffers } from "@/src/db/catalog";
import LiveOfferCard from "@/components/LiveOfferCard";
import { defaultCheckIn,type StayDuration } from "@/src/core/search";
import SourceStayForm from "@/components/SourceStayForm";
import SaveHotelButton from "@/components/SaveHotelButton";
import RateAlertForm from "@/components/RateAlertForm";
import StayReadiness from "@/components/StayReadiness";
import { hotelSeoEvidence } from "@/src/seo/hotel";
import { requestLanguage } from "@/src/i18n/server";
import { copy,localizedHref } from "@/src/i18n/config";
import { localizedMetadata } from "@/src/seo/public";
import ShareSearchButton from "@/components/ShareSearchButton";
import { publicSearchQuery } from "@/src/core/shared-search";

const allowed=new Set([30,60,90,120,180,365]);
function sameName(a:string,b:string){const norm=(s:string)=>s.normalize("NFD").replace(/[\u0300-\u036f]/g,"").toLowerCase().replace(/[^a-z0-9]+/g," ").trim();return norm(a)===norm(b)}
export async function generateMetadata({params}:{params:Promise<{id:string}>}){
 const {id}=await params;const h=await resolveDirectoryHotel(id);if(!h)return{};const lang=await requestLanguage();const seo=await hotelSeoEvidence(h);
 return localizedMetadata("/stays/"+encodeURIComponent(h.id),lang,h.name+copy(lang," · Long stay"," · Larga estancia"),h.name+" · "+h.city+", "+h.country+". "+copy(lang,"Explore this hotel for 30–90 nights and request a rate for your dates.","Consulta este hotel para 30–90 noches y solicita una tarifa para tus fechas."),seo.index);
}
export default async function StayDetail({params,searchParams}:{params:Promise<{id:string}>;searchParams:Promise<{duration?:string;checkIn?:string;occupancy?:string;maxMonthly?:string;returnTo?:string}>}){
 const [{id},q,language]=await Promise.all([params,searchParams,requestLanguage()]);const h=await resolveDirectoryHotel(id);if(!h)notFound();
 const t=(en:string,es:string)=>copy(language,en,es),local=(path:string)=>localizedHref(path,language);
 const duration=(allowed.has(Number(q.duration))?Number(q.duration):90) as StayDuration;
 const checkIn=/^\d{4}-\d{2}-\d{2}$/.test(q.checkIn||"")?q.checkIn!:defaultCheckIn();const occupancy=q.occupancy==="2"?2:1;
 const rawBudget=Number(q.maxMonthly);const budget=Number.isFinite(rawBudget)&&rawBudget>0?Math.min(50000,rawBudget):undefined;
 const paramsOut=new URLSearchParams({q:h.city,duration:String(duration),checkIn,occupancy:String(occupancy),...(budget?{maxMonthly:String(budget)}:{})});
 let back=local("/stays")+"?"+paramsOut;
 if(q.returnTo){try{const url=new URL(q.returnTo,"https://atlas.local");if(url.origin==="https://atlas.local"&&["/stays","/es/stays","/compare","/es/compare"].includes(url.pathname)){back=url.pathname+"?"+publicSearchQuery(url.search)+(url.pathname.endsWith("/compare")?"&ids="+(url.searchParams.get("ids")||"").replace(/[^a-zA-Z0-9_.:,-]/g,"").slice(0,540):"")}}catch{}}
 const candidates=await listSellableOffers({q:h.name,nights:duration,checkIn,occupancy,flexibleDays:0,limit:12}).catch(()=>[]);
 const live=candidates.filter(o=>o.city.toLowerCase()===h.city.toLowerCase()&&sameName(o.name,h.name)&&o.country.toLowerCase()===h.country.toLowerCase());
 const photos=(h.photoUrls||[]).slice(0,5),facilities=(h.facilities||[]).slice(0,12);
 return <main className="seoPage consumerStayDetail"><div className="shell"><a href={back} className="backLink">{t("← Back to stays","← Volver a las estancias")}</a>
 <section className="hotelDetailHero"><div className="hotelDetailCopy"><div className="eyebrow">{live.length?t("AVAILABLE NOW","DISPONIBLE AHORA"):t("REAL HOTEL · RATE ON REQUEST","HOTEL REAL · TARIFA BAJO PETICIÓN")}</div><h1>{h.name}</h1><p className="hotelDetailPlace">{h.address||h.city+", "+h.country}</p><p>{(language==="en"?h.description:null)||t("Explore this hotel for a month or a season. Request a quote to check the price and availability for your dates.","Consulta este hotel para un mes o una temporada. Solicita un presupuesto para comprobar precio y disponibilidad en tus fechas.")}</p>
 {facilities.length>0&&<div className="chips">{facilities.map(x=><span className="chip" key={x}>✓ {x}</span>)}</div>}
 <div className="actions"><SaveHotelButton hotel={{id:h.id,name:h.name,city:h.city,country:h.country,source:h.source}}/><ShareSearchButton query={paramsOut.toString()} hotelIds={[h.id]}/></div>
 <details className="trustDetails"><summary>{t("Listing details and sources","Datos de la ficha y fuentes")}</summary><p>{t("This listing identifies a hotel. Availability, facilities and rates are checked separately. A listing does not create a reservation.","Esta ficha identifica un hotel. La disponibilidad, los servicios y las tarifas se comprueban por separado. Una ficha no crea una reserva.")}</p>{h.referenceUrl&&<a className="secondaryLink" href={h.referenceUrl} target="_blank" rel="noreferrer">{t("Location source ↗","Fuente de ubicación ↗")}</a>}{h.website&&<a className="secondaryLink" href={h.website} target="_blank" rel="noreferrer">{t("Official hotel site ↗","Web oficial del hotel ↗")}</a>}</details></div>
 <div className="hotelDetailMedia">{photos.length?photos.map((src,i)=><img src={src} alt={h.name} key={src} loading={i===0?"eager":"lazy"} referrerPolicy="no-referrer"/>):<div className="hotelDetailFallback travelFallback"><span>{h.city}</span><small>{h.country}</small><em>{duration} {t("nights could start here.","noches podrían empezar aquí.")}</em></div>}</div></section>
 {live.length?<section className="discovery hotelDetailOffers"><div className="sectionTitle"><h2>{t("Options for your stay.","Opciones para tu estancia.")}</h2><p>{t("Review the total and conditions before continuing to booking.","Consulta el total y las condiciones antes de continuar con la reserva.")}</p></div><div className="hotels">{live.map((o,i)=><LiveOfferCard key={o.offerId} offer={o} detailHref={local("/live/"+encodeURIComponent(o.slug))} href={"/api/referral?offer="+encodeURIComponent(o.offerId)+"&from="+encodeURIComponent(local("/stays/"+id))+"&pos="+(i+1)} language={language}/>)}</div></section>:<div className="card ratePendingCard" id="request"><div className="eyebrow">{t("RATE ON REQUEST","TARIFA BAJO PETICIÓN")} · {duration} {t("NIGHTS","NOCHES")}</div><h2>{t("A month or a season at ","Un mes o una temporada en ")}{h.name}</h2><SourceStayForm hotelId={h.id} defaultCheckIn={checkIn} defaultDuration={duration} defaultOccupancy={occupancy} defaultBudget={budget}/></div>}
 <StayReadiness duration={duration}/><RateAlertForm hotel={{id:h.id,name:h.name,city:h.city,country:h.country}} defaultCheckIn={checkIn} defaultDuration={duration} defaultOccupancy={occupancy} defaultBudget={budget}/>
 </div></main>;
}
