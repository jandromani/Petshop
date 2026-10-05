import type { PresenceRange } from "@/src/compliance/schengen";
const DAY=86400000;
function ms(date:string){const n=Date.parse(date+"T00:00:00Z");if(!Number.isFinite(n))throw new Error("invalid-date");return n}

export function calendarYearPresenceDays(ranges:PresenceRange[],year:number){
  const start=Date.UTC(year,0,1),end=Date.UTC(year,11,31);const days=new Set<number>();
  for(const r of ranges){const a=Math.max(start,ms(r.entry)),b=Math.min(end,ms(r.exit));if(b<a)continue;for(let t=a;t<=b;t+=DAY)days.add(t);}
  return days.size;
}

export function assessTaxDayScreen(ranges:PresenceRange[],year:number){
  const days=calendarYearPresenceDays(ranges,year);
  const level=days>=183?"HIGH_DAY_COUNT":days>=150?"REVIEW_SOON":"BELOW_DAY_SCREEN";
  return{year,days,level,threshold:183,determination:false,notes:["This is a day-count screen, not a tax-residence determination.","Domestic law, treaty tie-breakers, permanent home, family and centre-of-economic-interests tests can change the result.","Do not use Atlas to claim tax residence or non-residence."]};
}
