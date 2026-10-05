export type LiveCatalogRow={
  offerId:string;
  offerKind?:"snapshot"|"direct";
  checkoutMode?:"redirect"|"atlas_checkout";
  channelModel?:"REFERRAL"|"MERCHANT"|"EXCLUSIVE_MERCHANT";
  hotelId:string;
  slug:string;
  name:string;
  city:string;
  country:string;
  region:string|null;
  lat:number|null;
  lng:number|null;
  provider:string;
  checkIn:string;
  checkOut:string;
  nights:number;
  occupancy:number;
  board:string|null;
  roomType:string|null;
  cancellation?:string|null;
  taxesIncluded?:boolean|null;
  silverScore?:number|null;
  silverBreakdown?:Array<{label:string;points:number;max:number}>;
  photoUrls?:string[];
  facilities?:string[];
  description?:string|null;
  displayPrice:number;
  currency:string;
  verifiedAt:string;
  expiresAt:string|null;
  confidence:number;
};

export type LiveCatalogOffer=LiveCatalogRow & { monthlyEquivalent:number };

export function monthlyEquivalent(displayPrice:number,nights:number){
  if(!Number.isFinite(displayPrice)||displayPrice<=0) throw new Error("displayPrice must be positive");
  if(!Number.isFinite(nights)||nights<=0) throw new Error("nights must be positive");
  return Math.round((displayPrice/nights)*30*100)/100;
}

export function normalizeLiveCatalogRow(row:LiveCatalogRow):LiveCatalogOffer{
  return{...row,monthlyEquivalent:monthlyEquivalent(row.displayPrice,row.nights)};
}

export function safeCommercialUrl(provider:string,raw:string,approvedHost?:string){
  let url:URL;
  try{url=new URL(raw);}catch{return null;}
  if(url.protocol!=="https:") return null;
  const host=url.hostname.toLowerCase();
  if(provider==="booking" && !(host==="booking.com" || host.endsWith(".booking.com"))) return null;
  if(provider==="direct" && (!approvedHost || host!==approvedHost.toLowerCase())) return null;
  if(!["booking","direct"].includes(provider)) return null;
  return url;
}
