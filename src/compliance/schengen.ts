export type PresenceRange={entry:string;exit:string};
export type SchengenAssessment={eligible:boolean;hotelNights:number;presenceDays:number;priorDaysAtEntry:number;firstBreachDate:string|null;allowedPresenceDays:number;rule:"90_IN_180";notes:string[]};
const DAY=86400000;
function ms(date:string){const n=Date.parse(date+"T00:00:00Z");if(!Number.isFinite(n))throw new Error("invalid-date");return n}
function iso(value:number){return new Date(value).toISOString().slice(0,10)}
function dateSet(ranges:PresenceRange[]){
  const out=new Set<string>();for(const r of ranges){const a=ms(r.entry),b=ms(r.exit);if(b<a)throw new Error("invalid-range");for(let t=a;t<=b;t+=DAY)out.add(iso(t));}return out;
}
function countWindow(days:Set<string>,endMs:number,includeEnd=true){
  const start=endMs-179*DAY;let count=0;for(const d of days){const t=ms(d);if(t>=start&&(includeEnd?t<=endMs:t<endMs))count++;}return count;
}

export function assessSchengen90In180(previous:PresenceRange[],checkIn:string,nights:number):SchengenAssessment{
  if(!Number.isInteger(nights)||nights<1||nights>365)throw new Error("invalid-nights");
  const history=dateSet(previous);const entry=ms(checkIn);const priorDaysAtEntry=countWindow(history,entry,false);
  const combined=new Set(history);const presenceDays=nights+1;let firstBreachDate:string|null=null;let allowedPresenceDays=0;
  for(let i=0;i<presenceDays;i++){const day=entry+i*DAY;combined.add(iso(day));const used=countWindow(combined,day,true);if(used>90){firstBreachDate=iso(day);break;}allowedPresenceDays=i+1;}
  return{eligible:firstBreachDate===null,hotelNights:nights,presenceDays,priorDaysAtEntry,firstBreachDate,allowedPresenceDays,rule:"90_IN_180",notes:["Entry and exit dates count as presence days.","This calculator does not account for residence permits, long-stay visas or bilateral exceptions.","Use the European Commission calculator for the final short-stay check."]};
}

export function parsePresenceRanges(raw:string){
  if(!raw.trim())return[];
  return raw.split(/[,\n]+/).map(part=>part.trim()).filter(Boolean).map(part=>{const m=part.match(/^(\d{4}-\d{2}-\d{2})\s*(?:\.\.|to|→|-)\s*(\d{4}-\d{2}-\d{2})$/i);if(!m)throw new Error("Use YYYY-MM-DD..YYYY-MM-DD");return{entry:m[1],exit:m[2]};});
}
