import { z } from "zod";
import { llmCompletion,agentModelConfigured } from "@/src/agents/llm";
import { realHotels } from "@/src/data/real-hotels";
import { overtureHotels } from "@/src/data/overture-hotels";
import { enforceRateLimit,requestFingerprint } from "@/src/security/rate-limit";

export const runtime="nodejs";
const Durations=[30,60,90,120,180,365] as const;
const Input=z.object({prompt:z.string().min(2).max(800),current:z.object({region:z.enum(["All","Europe","Asia","Africa","Americas"]).default("All"),duration:z.number().default(90),occupancy:z.number().default(1),maxMonthly:z.number().positive().max(50000).optional()}).optional()});
const Intent=z.object({query:z.string().max(100).default(""),region:z.enum(["All","Europe","Asia","Africa","Americas"]).default("All"),duration:z.union([z.literal(30),z.literal(60),z.literal(90),z.literal(120),z.literal(180),z.literal(365)]).default(90),occupancy:z.union([z.literal(1),z.literal(2)]).default(1),maxMonthly:z.number().positive().max(50000).nullable().default(null),flexibleDays:z.union([z.literal(0),z.literal(7),z.literal(30)]).default(7),amenities:z.array(z.string().max(40)).max(12).default([]),summary:z.string().max(240).default("Filters applied.")});
const SUPPORTED=new Set(["pool","gym","spa","beach","breakfast","all inclusive","kitchen"]);
const aliases:Record<string,string>={"sea":"beach","fitness":"gym","fitness center":"gym","fitness centre":"gym","swimming pool":"pool","all-inclusive":"all inclusive"};
function finalize(intent:z.infer<typeof Intent>){
  const normalized=intent.amenities.map(x=>(aliases[x.trim().toLowerCase()]||x.trim().toLowerCase())).filter(Boolean);
  const amenities=[...new Set(normalized.filter(x=>SUPPORTED.has(x)))].slice(0,8);
  const unsupportedPreferences=[...new Set(normalized.filter(x=>!SUPPORTED.has(x)))].slice(0,8);
  return{...intent,amenities,unsupportedPreferences,evidenceMode:unsupportedPreferences.length?"partial":"supported" as const};
}

const searchable=[...realHotels.flatMap(h=>[h.city,h.country]),...overtureHotels.flatMap(h=>[h.market,h.city,h.country])];
const geoTerms=[...new Set(searchable)].sort((a,b)=>b.length-a.length);
function nearestDuration(days:number){return Durations.reduce((best,d)=>Math.abs(d-days)<Math.abs(best-days)?d:best,90 as typeof Durations[number]);}
function heuristic(prompt:string,current?:z.infer<typeof Input>["current"]){
  const lower=prompt.toLowerCase();
  let duration=nearestDuration(current?.duration||90);
  const day=lower.match(/(\d{2,3})\s*(?:day|days|d\b)/i);const months=lower.match(/(\d{1,2})\s*(?:month|months|mo\b)/i);const year=/\b(?:one|1|full)\s*year\b|\bannual\b/i.test(lower);
  if(year)duration=365;else if(day)duration=nearestDuration(Number(day[1]));else if(months)duration=nearestDuration(Number(months[1])*30);
  const budgetMatches=[...prompt.matchAll(/(?:€|eur\s*|euros?\s*)(\d{3,5})|(\d{3,5})\s*(?:€|eur|euros?)/gi)].map(m=>Number(m[1]||m[2])).filter(Number.isFinite);
  const maxMonthly=budgetMatches[0]||current?.maxMonthly||null;
  const occupancy:1|2=/\b(couple|two adults|2 adults|we are two|for two)\b/i.test(lower)?2:1;
  const region=/\basia\b/i.test(lower)?"Asia":/\bafrica\b/i.test(lower)?"Africa":/\b(europe|european)\b/i.test(lower)?"Europe":/\b(americas?|latin america|south america|mexico|colombia|peru|argentina)\b/i.test(lower)?"Americas":current?.region||"All";
  const hit=geoTerms.find(x=>lower.includes(x.toLowerCase()));
  const amenities=["pool","gym","spa","beach","sea","hospital","clinic","walkable","breakfast","all inclusive","kitchen","warm winter","car dependency"].filter(x=>lower.includes(x));
  const flexibleDays:0|7|30=/exact dates|not flexible/i.test(lower)?0:/very flexible|anytime|flexible month/i.test(lower)?30:7;
  return{query:hit||"",region,duration,occupancy,maxMonthly,flexibleDays,amenities,summary:"Atlas converted your request into deterministic hotel-search filters."};
}
function parseJson(text:string){const cleaned=text.replace(/^```(?:json)?/i,"").replace(/```$/,"").trim();const a=cleaned.indexOf("{"),b=cleaned.lastIndexOf("}");if(a<0||b<a)throw new Error("no-json");return JSON.parse(cleaned.slice(a,b+1));}

export async function POST(req:Request){
  const gate=await enforceRateLimit({key:requestFingerprint(req,"ai-hotel-search"),limit:30,windowSeconds:600});if(!gate.allowed)return Response.json({error:"rate-limited"},{status:429});
  const parsed=Input.safeParse(await req.json().catch(()=>null));if(!parsed.success)return Response.json({error:"invalid-request"},{status:400});
  const fallback=heuristic(parsed.data.prompt,parsed.data.current);
  if(!agentModelConfigured())return Response.json({intent:finalize(fallback),mode:"deterministic"});
  const system="You convert a traveller request into Atlas hotel-search filters. Return JSON only. Never recommend or invent a hotel, price, availability, distance, climate, healthcare fact or amenity. query must be only a place/city/country/hotel-name search term, or empty. Allowed region: All, Europe, Asia, Africa, Americas. Allowed duration: 30,60,90,120,180,365. occupancy: 1 or 2. flexibleDays: 0,7,30. maxMonthly is EUR per 30 days or null. amenities are preference words only; they may be unknown for individual hotels. You may preserve user concepts such as walkable, hospital, clinic, warm winter or car dependency in amenities; the server will explicitly classify which ones have enough evidence to rank. Keep summary factual and short.";
  try{
    const completion=await llmCompletion([{role:"system",content:system},{role:"user",content:JSON.stringify({request:parsed.data.prompt,current:parsed.data.current,output:{query:"string",region:"enum",duration:"enum",occupancy:"1|2",maxMonthly:"number|null",flexibleDays:"0|7|30",amenities:["string"],summary:"string"}})}],{role:"public",maxTokens:320,temperature:0});
    const candidate=Intent.safeParse(parseJson(completion.text));
    if(candidate.success)return Response.json({intent:finalize(candidate.data),mode:"ai",provider:completion.provider});
  }catch{}
  return Response.json({intent:finalize(fallback),mode:"deterministic-fallback"});
}