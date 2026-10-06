import { z } from "zod";
export const hotelIdSchema=z.string().min(4).max(180).regex(/^[a-zA-Z0-9_.:-]+$/);
export const searchKeys=["q","searchScope","region","duration","occupancy","checkIn","flexibleDays","maxMonthly","minMonthly","features","featuresMode","verifiedOnly","board","cancellation","provider","brand","brandedOnly","sort","page","bbox","selected","view"] as const;
export const shareSearchInput=z.object({query:z.string().max(2400),hotelIds:z.array(hotelIdSchema).max(3).default([]),language:z.enum(["en","es"]).default("en")}).strict();
export function publicSearchQuery(query:string){
  const source=new URLSearchParams(query);const result=new URLSearchParams();
  for(const key of searchKeys){const value=source.get(key);if(value&&value.length<=180&&!/[\u0000-\u001f<>]/.test(value))result.set(key,value)}
  return result.toString();
}
export function comparisonIds(raw:string|undefined){return [...new Set((raw||"").split(",").filter(x=>hotelIdSchema.safeParse(x).success))].slice(0,3)}
export function searchShareTitle(query:string,language:"en"|"es"="en"){
  const p=new URLSearchParams(publicSearchQuery(query));const destination=p.get("q")|| (language==="es"?"Tu próxima temporada":"Your next season");
  const days=["30","60","90","120","180","365"].includes(p.get("duration")||"")?p.get("duration"):"60";
  return destination+" · "+days+(language==="es"?" días":" days");
}
