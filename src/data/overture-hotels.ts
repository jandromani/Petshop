import rows from "@/src/data/overture-hotels.generated.json";

export type OvertureHotel={
  id:string;
  sourceId:string;
  name:string;
  city:string;
  market:string;
  country:string;
  region:"Europe"|"Asia"|"Africa"|"Americas";
  lat:number;
  lng:number;
  address:string|null;
  website:string|null;
  referenceUrl:string;
  confidence:number|null;
};

function valid(row:any):row is OvertureHotel{
  return Boolean(
    row&&typeof row.id==="string"&&typeof row.sourceId==="string"&&typeof row.name==="string"&&
    typeof row.city==="string"&&typeof row.market==="string"&&typeof row.country==="string"&&
    ["Europe","Asia","Africa","Americas"].includes(row.region)&&
    Number.isFinite(row.lat)&&Number.isFinite(row.lng)&&typeof row.referenceUrl==="string"
  );
}

export const overtureHotels=(rows as unknown[]).filter(valid) as OvertureHotel[];
export const overtureHotelById=(id:string)=>overtureHotels.find(h=>h.id===id);
