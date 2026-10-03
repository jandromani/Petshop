import { findCanonicalCandidates,upsertCanonicalHotel,type CanonicalCandidate } from "@/src/db/supply";

const STOP=new Set(["hotel","resort","residence","apartments","apartment","club","the","spa"]);

function tokens(name:string){
  return new Set(name.normalize("NFD").replace(/[\u0300-\u036f]/g,"").toLowerCase().replace(/[^a-z0-9 ]+/g," ").split(/\s+/).filter(x=>x&&!STOP.has(x)));
}
function jaccard(a:Set<string>,b:Set<string>){
  const union=new Set([...a,...b]);if(!union.size)return 0;
  let inter=0;for(const x of a)if(b.has(x))inter++;
  return inter/union.size;
}
function distanceKm(a:{lat?:number|null;lng?:number|null},b:{lat?:number|null;lng?:number|null}){
  if(!Number.isFinite(a.lat)||!Number.isFinite(a.lng)||!Number.isFinite(b.lat)||!Number.isFinite(b.lng))return null;
  const r=(v:number)=>v*Math.PI/180;
  const dLat=r(Number(b.lat)-Number(a.lat)),dLng=r(Number(b.lng)-Number(a.lng));
  const h=Math.sin(dLat/2)**2+Math.cos(r(Number(a.lat)))*Math.cos(r(Number(b.lat)))*Math.sin(dLng/2)**2;
  return 6371*2*Math.atan2(Math.sqrt(h),Math.sqrt(1-h));
}

export function identityScore(input:{name:string;city:string;country:string;lat?:number|null;lng?:number|null},candidate:CanonicalCandidate){
  if(input.city.toLowerCase()!==candidate.city.toLowerCase()||input.country.toLowerCase()!==candidate.country.toLowerCase())return 0;
  const nameScore=jaccard(tokens(input.name),tokens(candidate.name));
  const km=distanceKm(input,candidate);
  if(km===null&&nameScore===1) return .82;
  const geoScore=km===null?0:km<=.25?1:km<=1?.85:km<=3?.55:km<=8?.2:0;
  return Math.round((nameScore*.55+geoScore*.35+.10)*1000)/1000;
}

export async function resolveCanonicalHotel(input:{
  provider:string;providerHotelId:string;name:string;city:string;country:string;region?:string;lat?:number|null;lng?:number|null;
}){
  const candidates=await findCanonicalCandidates({city:input.city,country:input.country});
  const ranked=candidates.map(candidate=>({candidate,score:identityScore(input,candidate)})).sort((a,b)=>b.score-a.score);
  if(ranked[0]&&ranked[0].score>=.72)return{id:ranked[0].candidate.id,slug:ranked[0].candidate.slug,matched:true,score:ranked[0].score};
  const safeProvider=input.provider.toLowerCase().replace(/[^a-z0-9]+/g,"-");
  const safeId=input.providerHotelId.toLowerCase().replace(/[^a-z0-9]+/g,"-");
  const slug=safeProvider+"-"+safeId;
  const id=await upsertCanonicalHotel({slug,name:input.name,city:input.city,country:input.country,region:input.region,lat:input.lat??undefined,lng:input.lng??undefined});
  return{id,slug,matched:false,score:0};
}
