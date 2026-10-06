import { copy,localizedHref,type Language } from "@/src/i18n/config";
import type { LiveCatalogOffer } from "@/src/core/live-offers";
import SaveStayButton from "@/components/SaveStayButton";

const money=(n:number,currency:string)=>new Intl.NumberFormat("en-US",{style:"currency",currency,maximumFractionDigits:0}).format(n);

export default function LiveOfferCard({offer,href,detailHref,language="en"}:{offer:LiveCatalogOffer;href:string;detailHref?:string;language?:Language}){
  const t=(en:string,es:string)=>copy(language,en,es);
  const photos=(offer.photoUrls||[]).slice(0,3);const facilities=(offer.facilities||[]).slice(0,4);
  const managed=offer.checkoutMode==="atlas_checkout";
  const bookingHref=managed?localizedHref("/checkout/"+encodeURIComponent(offer.offerId),language)+"?checkIn="+encodeURIComponent(offer.checkIn)+"&nights="+offer.nights+"&occupancy="+offer.occupancy:href;
  return <article className="hotel liveHotel liveOfferCard">
    <div className={"liveMedia "+(photos.length?"hasPhotos":"noPhotos")}>
      {photos.length?<div className="livePhotoGrid">{photos.map((src,i)=><img key={src} src={src} alt={i===0?offer.name:t("Hotel view","Vista del hotel")} loading="lazy" referrerPolicy="no-referrer"/>)}</div>:<div className="liveMediaFallback travelFallback"><span>{offer.city}</span><small>{offer.country}</small></div>}
      <div className="liveMediaBadges"><span className="score verifiedBadge">{managed?"ATLAS CHECKOUT":t("AVAILABLE NOW","DISPONIBLE AHORA")}</span></div>
    </div>
    <div className="hotelBody">
      <div className="hotelTopline"><span>{offer.city}</span><span>{managed?t("DIRECT HOTEL RATE","TARIFA DIRECTA"):t("VERIFIED PRICE","TARIFA VERIFICADA")}</span></div>
      <SaveStayButton offer={offer}/>
      <h3>{offer.name}</h3>
      <div className="loc">{offer.city}, {offer.country} · {offer.nights} {t("nights","noches")} · {offer.occupancy} {t(offer.occupancy===1?"guest":"guests",offer.occupancy===1?"huésped":"huéspedes")}</div>
      <div className="chips">
        {offer.board&&<span className="chip">{offer.board}</span>}
        {offer.cancellation&&<span className="chip">{offer.cancellation}</span>}
        {offer.taxesIncluded===true&&<span className="chip">{t("Taxes included","Impuestos incluidos")}</span>}
        {facilities.map(x=><span className="chip" key={x}>✓ {x}</span>)}
      </div>
      <div className="priceRow">
        <div><b>{money(offer.monthlyEquivalent,offer.currency)}</b><small>{t("/month equivalent ·","/mes equivalente ·")} {money(offer.displayPrice,offer.currency)} {t("total","total")}</small></div>
        <div className="directoryLinks">{detailHref&&<a className="secondaryLink" href={detailHref}>{t("Details","Detalles")}</a>}<a className="linkbtn" href={bookingHref}>{managed?t("Book with Atlas →","Reservar con Atlas →"):t("View booking option →","Consultar opción de reserva →")}</a></div>
      </div>
    </div>
  </article>;
}
