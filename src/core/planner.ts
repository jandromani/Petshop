import type { Hotel } from "@/src/data/hotels";
import type { StayDuration } from "@/src/core/search";

export type PlanMode = "world" | "winter" | "value" | "slow";
export type Party = "solo" | "couple";

export type PlanStop = {
  stopId:string;
  hotel: Hotel;
  days: number;
  monthlyCost: number;
  transport: number;
  transportDistanceKm: number;
  transportMode: "start" | "ground" | "flight" | "stay";
  effectiveMonthly:number;
};

const mobility = (a: Hotel, b: Hotel) => {
  if(a.id===b.id) return{km:0,mode:"stay" as const,cost:0};
  const toRad = (v: number) => (v * Math.PI) / 180;
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const aa =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(a.lat)) * Math.cos(toRad(b.lat)) * Math.sin(dLng / 2) ** 2;
  const km = 6371 * 2 * Math.atan2(Math.sqrt(aa), Math.sqrt(1 - aa));
  return {
    km: Math.round(km),
    mode: (km > 700 ? "flight" : "ground") as "flight" | "ground",
    cost: Math.round(Math.max(45, Math.min(520, 35 + km * 0.055))),
  };
};

export function adjustedMonthly(hotel: Hotel, party: Party) {
  return Math.round(hotel.monthly * (party === "couple" ? hotel.coupleFactor : 1));
}

function stopDays(duration:StayDuration){
  const count=Math.max(1,Math.round(365/duration));
  const base=Math.floor(365/count);
  const extra=365-base*count;
  return Array.from({length:count},(_,i)=>base+(i<extra?1:0));
}

function orderedCandidates(hotels:Hotel[],party:Party,mode:PlanMode){
  let candidates=[...hotels];
  if(mode==="winter") candidates=candidates.filter(h=>/2[0-9]°C|19°C|18°C/.test(h.climate));
  if(mode==="slow") candidates=candidates.filter(h=>h.region==="Europe");
  if(mode==="value") candidates.sort((a,b)=>adjustedMonthly(a,party)-adjustedMonthly(b,party)||b.score-a.score);
  else candidates.sort((a,b)=>b.score-a.score||adjustedMonthly(a,party)-adjustedMonthly(b,party));
  return candidates;
}

export function buildPlan(
  hotels: Hotel[],
  budget: number,
  party: Party,
  duration: StayDuration,
  mode: PlanMode
): PlanStop[] {
  const monthlyBudget=Math.max(0,Math.round(budget));
  if(monthlyBudget<=0) return[];
  const candidates=orderedCandidates(hotels,party,mode).filter(h=>adjustedMonthly(h,party)<=monthlyBudget);
  if(!candidates.length) return[];

  const days=stopDays(duration);
  const result:PlanStop[]=[];
  const usedRegions=new Set<string>();

  for(let i=0;i<days.length;i++){
    const previous=result.at(-1)?.hotel;
    const preferred=mode==="world"
      ? [...candidates].sort((a,b)=>{
          const ar=usedRegions.has(a.region)?1:0;
          const br=usedRegions.has(b.region)?1:0;
          return ar-br||b.score-a.score;
        })
      : candidates;

    let choice:Hotel|undefined;
    let move:{km:number;mode:"flight"|"ground"|"stay";cost:number}|undefined;
    for(const candidate of preferred){
      if(previous&&candidate.id===previous.id) continue;
      const m=previous?mobility(previous,candidate):{km:0,mode:"stay" as const,cost:0};
      const effective=adjustedMonthly(candidate,party)+m.cost/(days[i]/30);
      if(effective<=monthlyBudget){
        choice=candidate;move=m;break;
      }
    }

    if(!choice){
      if(previous){
        choice=previous;
        move={km:0,mode:"stay",cost:0};
      }else{
        choice=candidates[0];
        move={km:0,mode:"stay",cost:0};
      }
    }

    const monthlyCost=adjustedMonthly(choice,party);
    const transport=i===0?0:(move?.cost??0);
    const effectiveMonthly=Math.round((monthlyCost+transport/(days[i]/30))*100)/100;
    result.push({
      stopId:choice.id+"-"+i,
      hotel:choice,
      days:days[i],
      monthlyCost,
      transport,
      transportDistanceKm:i===0?0:(move?.km??0),
      transportMode:i===0?"start":(move?.mode??"stay"),
      effectiveMonthly,
    });
    usedRegions.add(choice.region);
  }
  return result;
}

export function planTotals(stops: PlanStop[]) {
  const hotelTotal = stops.reduce((s, x) => s + x.monthlyCost * (x.days / 30), 0);
  const transportTotal = stops.reduce((s, x) => s + x.transport, 0);
  const days = stops.reduce((s, x) => s + x.days, 0);
  const total=Math.round(hotelTotal+transportTotal);
  return {
    hotelTotal: Math.round(hotelTotal),
    transportTotal,
    total,
    days,
    averageMonthly:days?Math.round(total/(days/30)):0,
  };
}
