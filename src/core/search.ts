import type { Hotel } from "@/src/data/hotels";
import { adjustedMonthly,type Party } from "@/src/core/planner";

export type StayDuration=30|60|90|120|180;
export type SearchRegion="All"|"Europe"|"Asia"|"Africa"|"Americas";

export type StaySearch={
  query:string;
  region:SearchRegion;
  checkIn:string;
  flexibleDays:0|7|30;
  duration:StayDuration;
  party:Party;
  maxMonthly:number;
};

export function defaultCheckIn(now=new Date()){
  const d=new Date(Date.UTC(now.getUTCFullYear(),now.getUTCMonth(),now.getUTCDate()));
  d.setUTCDate(d.getUTCDate()+60);
  return d.toISOString().slice(0,10);
}

export function addDays(date:string,days:number){
  const d=new Date(date+"T00:00:00Z");
  if(Number.isNaN(d.getTime())) throw new Error("invalid-date");
  d.setUTCDate(d.getUTCDate()+days);
  return d.toISOString().slice(0,10);
}

export function filterDemoHotels(hotels:Hotel[],search:StaySearch){
  const q=search.query.trim().toLowerCase();
  return hotels.filter(h=>{
    if(search.region!=="All"&&h.region!==search.region) return false;
    if(adjustedMonthly(h,search.party)>search.maxMonthly) return false;
    if(!q) return true;
    return [h.name,h.city,h.country,h.climate,h.board,...h.tags].join(" ").toLowerCase().includes(q);
  });
}
