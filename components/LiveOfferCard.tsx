import type { LiveCatalogOffer } from "@/src/core/live-offers";
import SaveStayButton from "@/components/SaveStayButton";

const money=(n:number,currency:string)=>new Intl.NumberFormat("en-US",{style:"currency",currency,maximumFractionDigits:0}).format(n);

export default function LiveOfferCard({offer,href,detailHref}:{offer:LiveCatalogOffer;href:string;detailHref?:string}){
  const photos=(offer.photoUrls||[]).slice(0,3);
  const facilities=(offer.facilities||[]).slice(0,4);
  return <article className="hotel liveHotel liveOfferCard">
    <div className={"liveMedia "+(photos.length?"hasPhotos":"noPhotos")}>
      {photos.length
        ? <div className="livePhotoGrid">{photos.map((src,i)=><img key={src} src={src} alt={i===0?offer.name+" exterior or room":"Hotel view"} loading="lazy" referrerPolicy="no-referrer"/>)}</div>
        : <div className="liveMediaFallback"><span>✓</span><b>{offer.city}</b></div>}
      <div className="liveMediaBadges">
        <span className="score">LIVE {Math.round(offer.confidence*100)}%</span>
        {offer.silverScore!==null&&offer.silverScore!==undefined&&<span className="score">SILVER {Math.round(offer.silverScore)}</span>}
      </div>
    </div>
    <div className="hotelBody">
      <div className="hotelTopline"><span>{offer.provider.toUpperCase()}</span><span>verified {new Date(offer.verifiedAt).toLocaleString()}</span></div>
      <SaveStayButton offer={offer}/>
      <h3>{offer.name}</h3>
      <div className="loc">{offer.city}, {offer.country} · {offer.nights} nights · {offer.occupancy} adult{offer.occupancy===1?"":"s"}</div>
      {detailHref&&<a className="eyebrow" href={detailHref}>View verified hotel detail →</a>}
      <div className="chips">
        {offer.board&&<span className="chip">{offer.board}</span>}
        {offer.roomType&&<span className="chip">Room {offer.roomType}</span>}
        {offer.cancellation&&<span className="chip">{offer.cancellation}</span>}
        {offer.taxesIncluded!==undefined&&offer.taxesIncluded!==null&&<span className="chip">{offer.taxesIncluded?"Taxes included":"Some charges may be extra"}</span>}
      </div>
      {facilities.length>0&&<div className="hotelMeta">{facilities.map(x=><span key={x}>✓ {x}</span>)}</div>}
      <div className="priceRow">
        <div><b>{money(offer.monthlyEquivalent,offer.currency)}</b><small>/30-day equivalent · {money(offer.displayPrice,offer.currency)} total</small></div>
        <a className="linkbtn" href={href}>Open verified offer →</a>
      </div>
    </div>
  </article>;
}
