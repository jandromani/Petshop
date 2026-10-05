export const SAVED_HOTELS_KEY="atlas_saved_hotels_v1";

export type SavedHotel={
  hotelId:string;
  name:string;
  city:string;
  country:string;
  source:string;
  savedAt:string;
};

export function parseSavedHotels(raw:string|null):SavedHotel[]{
  if(!raw)return[];
  try{
    const data=JSON.parse(raw);
    if(!Array.isArray(data))return[];
    return data.filter((x):x is SavedHotel=>Boolean(
      x&&typeof x==="object"&&typeof x.hotelId==="string"&&typeof x.name==="string"&&
      typeof x.city==="string"&&typeof x.country==="string"&&typeof x.source==="string"&&typeof x.savedAt==="string"
    )).slice(0,60);
  }catch{return[];}
}

export function mergeSavedHotels(...groups:SavedHotel[][]){
  const map=new Map<string,SavedHotel>();
  for(const group of groups)for(const row of group){
    const current=map.get(row.hotelId);
    if(!current||(Date.parse(row.savedAt)||0)>=(Date.parse(current.savedAt)||0))map.set(row.hotelId,row);
  }
  return [...map.values()].sort((a,b)=>(Date.parse(b.savedAt)||0)-(Date.parse(a.savedAt)||0)).slice(0,60);
}
