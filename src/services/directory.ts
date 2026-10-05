import { databaseConfigured } from "@/src/db/client";
import { fallbackDirectoryReference,getDirectoryHotel,type DirectoryHotel } from "@/src/db/directory";
import { realHotelById,realHotelReferenceUrl } from "@/src/data/real-hotels";
import { overtureHotelById } from "@/src/data/overture-hotels";

export async function resolveDirectoryHotel(id:string):Promise<DirectoryHotel|null>{
  if(databaseConfigured()){
    const row=await getDirectoryHotel(id).catch(()=>null);
    if(row)return{...row,referenceUrl:row.referenceUrl||fallbackDirectoryReference(row)};
  }
  const overture=overtureHotelById(id);
  if(overture)return{...overture,canonicalId:overture.id,source:"overture",description:null,photoUrls:[],facilities:[]};
  const seed=realHotelById(id);if(!seed)return null;
  return{...seed,canonicalId:seed.id,lat:null,lng:null,source:"curated_seed",sourceId:seed.id,referenceUrl:realHotelReferenceUrl(seed),website:null,address:null,confidence:null,description:null,photoUrls:[],facilities:[]};
}