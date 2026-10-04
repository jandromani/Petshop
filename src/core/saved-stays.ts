export const SAVED_STAYS_KEY="atlas_saved_stays_v1";

export type SavedStay={
  offerId:string;
  slug:string;
  name:string;
  city:string;
  country:string;
  provider:string;
  savedMonthly:number;
  currency:string;
  verifiedAt:string;
  expiresAt:string|null;
  savedAt:string;
};

export function parseSavedStays(raw:string|null):SavedStay[]{
  if(!raw)return[];
  try{
    const data=JSON.parse(raw);
    if(!Array.isArray(data))return[];
    return data.filter((x):x is SavedStay=>Boolean(
      x&&typeof x==="object"&&typeof x.offerId==="string"&&typeof x.slug==="string"&&typeof x.name==="string"
      &&typeof x.savedMonthly==="number"&&typeof x.currency==="string"&&typeof x.savedAt==="string"
    )).slice(0,30);
  }catch{return[];}
}

export function toggleSavedStay(rows:SavedStay[],stay:SavedStay){
  const exists=rows.some(x=>x.offerId===stay.offerId);
  return exists?rows.filter(x=>x.offerId!==stay.offerId):[stay,...rows].slice(0,30);
}

export function mergeSavedStays(...groups:SavedStay[][]){
  const byOffer=new Map<string,SavedStay>();
  for(const group of groups){
    for(const row of group){
      const current=byOffer.get(row.offerId);
      const currentTime=current?Date.parse(current.savedAt)||0:-1;
      const nextTime=Date.parse(row.savedAt)||0;
      if(!current||nextTime>=currentTime)byOffer.set(row.offerId,row);
    }
  }
  return [...byOffer.values()]
    .sort((a,b)=>(Date.parse(b.savedAt)||0)-(Date.parse(a.savedAt)||0))
    .slice(0,30);
}
