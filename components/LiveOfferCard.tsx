import type { LiveCatalogOffer } from "@/src/core/live-offers";
import SaveStayButton from "@/components/SaveStayButton";

const money=(n:number,currency:string)=>new Intl.NumberFormat("en-US",{style:"currency",currency,maximumFractionDigits:0}).format(n);

export default function LiveOfferCard({offer,href,detailHref}:{offer:LiveCatalogOffer;href:string;detailHref?:string}){
  const photos=(offer.photoUrls||[]).slice(0,3);const facilities=(offer.facilities||[]).slice(0,4);
  const managed=offer.checkoutMode==="atlas_checkout";
  const bookingHref=managed?"/checkout/"+encodeURIComponent(offer.offerId)+"?checkIn="+encodeURIComponent(offer.checkIn)+"&nights="+offer.nights+"&occupancy="+offer.occupancy:href;
  return <article className="hotel liveHotel liveOfferCard">
    <div className={"liveMedia "+(photos.length?"hasPhotos":"noPhotos")}>
      {photos.length?<div className="livePhotoGrid">{photos.map((src,i)=><img key={src} src={src} alt={i===0?offer.name:"Hotel view"} loading="lazy" referrerPolicy="no-referrer"/>)}</div>:<div className="liveMediaFallback travelFallback"><span>{offer.city}</span><small>{offer.country}</small></div>}
      <div className="liveMediaBadges"><span className="score verifiedBadge">{managed?"ATLAS CHECKOUT":"AVAILABLE NOW"}</span></div>
    </div>
    <div className="hotelBody">
      <div className="hotelTopline"><span>{offer.city}</span><span>{managed?"MANAGED SUPPLY":"VERIFIED PRICE"}</span></div>
      <SaveStayButton offer={offer}/>
      <h3>{offer.name}</h3>
      <div className="loc">{offer.city}, {offer.country} · {offer.nights} nights · {offer.occupancy} guest{offer.occupancy===1?"":"s"}</div>
      <div className="chips">
        {offer.board&&<span className="chip">{offer.board}</span>}
        {offer.cancellation&&<span className="chip">{offer.cancellation}</span>}
        {offer.taxesIncluded===true&&<span className="chip">Taxes included</span>}
        {facilities.map(x=><span className="chip" key={x}>✓ {x}</span>)}
      </div>
      <div className="priceRow">
        <div><b>{money(offer.monthlyEquivalent,offer.currency)}</b><small>/month equivalent · {money(offer.displayPrice,offer.currency)} total</small></div>
        <div className="directoryLinks">{detailHref&&<a className="secondaryLink" href={detailHref}>Details</a>}<a className="linkbtn" href={bookingHref}>{managed?"Book with Atlas →":"View booking option →"}</a></div>
      </div>
    </div>
  </article>;
}
