import { databaseConfigured } from "@/src/db/client";
import { fallbackDirectoryReference,getDirectoryHotel,type DirectoryHotel } from "@/src/db/directory";
import { realHotelById } from "@/src/data/real-hotels";
import { enrichCuratedHotel } from "@/src/data/curated-enrichment";
import { overtureHotelById } from "@/src/data/overture-hotels";

export async function resolveDirectoryHotel(id:string):Promise<DirectoryHotel|null>{
  if(databaseConfigured()){
    const row=await getDirectoryHotel(id).catch(()=>null);
    if(row)return{...row,referenceUrl:row.referenceUrl||fallbackDirectoryReference(row)};
  }
  const overture=overtureHotelById(id);
  if(overture)return{...overture,canonicalId:overture.id,source:"overture",description:null,photoUrls:[],facilities:[]};
  const seed=realHotelById(id);if(!seed)return null;
  return enrichCuratedHotel(seed);
}