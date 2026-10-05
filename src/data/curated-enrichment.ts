import { realHotels,type RealHotel,realHotelReferenceUrl } from "@/src/data/real-hotels";
import { overtureHotels,type OvertureHotel } from "@/src/data/overture-hotels";

function norm(value:string){
  return value.normalize("NFD").replace(/[\u0300-\u036f]/g,"").toLowerCase()
    .replace(/&/g," and ").replace(/[^a-z0-9]+/g," ").trim().split(/\s+/)
    .filter(x=>!["hotel","resort","spa","the","a","an","by","and","collection","gl"].includes(x)).join(" ");
}

const matches=new Map<string,OvertureHotel>();
for(const hotel of realHotels){
  const candidates=overtureHotels.filter(o=>
    o.country===hotel.country &&
    (o.market===hotel.city||norm(o.market)===norm(hotel.city)||norm(o.city)===norm(hotel.city)) &&
    norm(o.name)===norm(hotel.name)
  );
  if(candidates.length===1)matches.set(hotel.id,candidates[0]);
}

export const curatedGeoSourceIds=new Set([...matches.values()].map(h=>h.sourceId));
export function curatedGeoMatch(id:string){return matches.get(id)||null;}
export function curatedGeoMatchCount(){return matches.size;}

export function enrichCuratedHotel(hotel:RealHotel){
  const match=matches.get(hotel.id);
  if(!match){
    return{
      ...hotel,canonicalId:hotel.id,lat:null,lng:null,market:hotel.city,
      source:"curated_seed",sourceId:hotel.id,website:null,address:null,confidence:null,
      description:null,photoUrls:[] as string[],facilities:[] as string[],
      referenceUrl:realHotelReferenceUrl(hotel),geoSource:null,
    };
  }
  return{
    ...hotel,canonicalId:hotel.id,lat:match.lat,lng:match.lng,market:match.market,
    source:"curated_seed",sourceId:hotel.id,website:match.website,address:match.address,
    confidence:match.confidence,description:null,photoUrls:[] as string[],facilities:[] as string[],
    referenceUrl:match.referenceUrl,geoSource:"overture",geoSourceId:match.sourceId,
  };
}

export const enrichedCuratedHotels=realHotels.map(enrichCuratedHotel);
