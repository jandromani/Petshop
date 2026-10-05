import { overtureHotels } from "@/src/data/overture-hotels";
import { enrichedCuratedHotels } from "@/src/data/curated-enrichment";

function slugify(value:string){
  return value.normalize("NFD").replace(/[\u0300-\u036f]/g,"").toLowerCase().replace(/[^a-z0-9]+/g,"-").replace(/^-|-$/g,"");
}

export type DestinationSeoPage={
  slug:string;market:string;country:string;region:"Europe"|"Asia"|"Africa"|"Americas";
  hotels:number;mapped:number;branded:number;officialSites:number;topBrands:string[];indexable:boolean;
};

export const destinationSeoPages:DestinationSeoPage[]=(()=>{
  const grouped=new Map<string,{market:string;country:string;region:DestinationSeoPage["region"];hotels:number;mapped:number;branded:number;officialSites:number;brands:Map<string,number>}>();
  for(const h of overtureHotels){
    const key=h.market+"|"+h.country;
    const row=grouped.get(key)||{market:h.market,country:h.country,region:h.region,hotels:0,mapped:0,branded:0,officialSites:0,brands:new Map<string,number>()};
    row.hotels++;if(Number.isFinite(h.lat)&&Number.isFinite(h.lng))row.mapped++;if(h.website)row.officialSites++;
    if(h.brand){row.branded++;row.brands.set(h.brand,(row.brands.get(h.brand)||0)+1);}
    grouped.set(key,row);
  }
  for(const h of enrichedCuratedHotels){
    const market=h.market||h.city,key=market+"|"+h.country;
    const row=grouped.get(key);if(!row)continue;
    row.hotels++;if(Number.isFinite(h.lat)&&Number.isFinite(h.lng))row.mapped++;if(h.website)row.officialSites++;
    if(h.brand){row.branded++;row.brands.set(h.brand,(row.brands.get(h.brand)||0)+1);}
  }
  return [...grouped.values()].map(row=>({
    slug:slugify(row.market+"-"+row.country),market:row.market,country:row.country,region:row.region,
    hotels:row.hotels,mapped:row.mapped,branded:row.branded,officialSites:row.officialSites,
    topBrands:[...row.brands.entries()].sort((a,b)=>b[1]-a[1]||a[0].localeCompare(b[0])).slice(0,6).map(([name])=>name),
    indexable:row.hotels>=20&&row.mapped>=20,
  })).sort((a,b)=>b.hotels-a.hotels||a.market.localeCompare(b.market));
})();

export function destinationSeoBySlug(slug:string){return destinationSeoPages.find(x=>x.slug===slug)||null;}
